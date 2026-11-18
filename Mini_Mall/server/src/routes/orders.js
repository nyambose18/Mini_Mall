import express from 'express';
import { z } from 'zod';
import { Order } from '../models/Order.js';
import { Product, PUBLIC_PRODUCT_STATUSES } from '../models/Product.js';
import { Refund } from '../models/Refund.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { AppError, asyncHandler, forbidden, notFound, parse } from '../utils/errors.js';
import { isObjectId, quoteFor } from '../utils/pricing.js';
import { eftReference, nextOrderNumber } from '../utils/refs.js';
import { buildCart } from '../services/cart.js';
import {
  addOrderEvent,
  eftExpiryDate,
  withOrderFlags,
} from '../services/orders.js';
import { refundEligibility } from '../services/refunds.js';

const router = express.Router();

router.use(requireAuth, requireRole('buyer'));

const checkoutSchema = z.object({
  address: z.string().trim().min(5, 'Enter a delivery address.'),
  postcode: z.string().trim().regex(/^\d{4}$/, 'Enter a 4-digit postcode.'),
  paymentMethod: z.enum(['eft', 'cod']),
});

const paySchema = z.object({
  result: z.enum(['success', 'fail']),
});

async function restoreReserved(reserved) {
  await Promise.all(
    reserved.map((entry) =>
      Product.updateOne({ _id: entry.productId }, { $inc: { stock: entry.qty } }),
    ),
  );
}

router.get(
  '/quote',
  asyncHandler(async (req, res) => {
    const quote = quoteFor(req.query.postcode);
    if (!quote) {
      throw new AppError(400, 'INVALID_POSTCODE', 'Enter a 4-digit South African postcode.');
    }
    res.json({ quote });
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = parse(checkoutSchema, req.body);
    const cart = await buildCart(req.user);

    if (!cart.items.length) {
      throw new AppError(400, 'CART_EMPTY', 'Your cart is empty.');
    }
    if (cart.mixedSellers) {
      throw new AppError(
        400,
        'MIXED_SELLERS',
        'This checkout supports one seller at a time. Remove items from another seller and try again.',
        { sellers: [...new Set(cart.items.map((item) => item.sellerName))] },
      );
    }
    const quote = quoteFor(input.postcode);
    if (!quote) {
      throw new AppError(400, 'INVALID_POSTCODE', 'Enter a 4-digit South African postcode.');
    }
    if (input.paymentMethod === 'cod' && !quote.codEligible) {
      throw new AppError(
        400,
        'COD_INELIGIBLE',
        'Cash on delivery is not available for this postcode. Please choose EFT instead.',
        { eligible: false },
      );
    }
    if (cart.hasProblems) {
      throw new AppError(
        409,
        'CART_CHANGED',
        'Some items are no longer available in the requested quantity. Please review your cart.',
        {
          items: cart.items
            .filter((item) => item.problem)
            .map((item) => ({
              productId: item.productId,
              title: item.title,
              problem: item.problem,
            })),
        },
      );
    }

    const sellerId = cart.items[0].sellerId;
    const snapshots = [];
    const reserved = [];

    try {
      for (const item of cart.items) {
        const updated = await Product.findOneAndUpdate(
          { _id: item.productId, status: { $in: PUBLIC_PRODUCT_STATUSES }, stock: { $gte: item.qty } },
          { $inc: { stock: -item.qty } },
          { new: true },
        );
        if (!updated) {
          throw new AppError(
            409,
            'STOCK_CHANGED',
            `"${item.title}" no longer has enough stock. Please review your cart.`,
            { items: [{ productId: item.productId, title: item.title, problem: 'No longer enough stock.' }] },
          );
        }
        reserved.push({ productId: item.productId, qty: item.qty });
        snapshots.push({
          productId: updated._id,
          title: updated.title,
          model: updated.model,
          qty: item.qty,
          unitPriceCents: updated.priceCents,
          lineTotalCents: updated.priceCents * item.qty,
        });
      }
    } catch (error) {
      await restoreReserved(reserved);
      throw error;
    }

    const subtotalCents = snapshots.reduce((sum, item) => sum + item.lineTotalCents, 0);
    const totalCents = subtotalCents + quote.feeCents;
    const isEft = input.paymentMethod === 'eft';
    const orderNumber = await nextOrderNumber();

    let order;
    try {
      order = new Order({
        orderNumber,
        buyerId: req.user._id,
        sellerId,
        items: snapshots,
        delivery: {
          address: input.address,
          postcode: quote.postcode,
          feeCents: quote.feeCents,
          workingDays: quote.workingDays,
          estimatedDate: new Date(quote.estimatedDate),
        },
        subtotalCents,
        totalCents,
        payment: isEft
          ? {
              method: 'eft',
              status: 'awaiting_eft',
              reference: eftReference(),
              expiresAt: eftExpiryDate(),
            }
          : { method: 'cod', status: 'due_on_delivery' },
      });
      addOrderEvent(order, {
        type: 'order_placed',
        label: 'Order placed',
        note: isEft
          ? 'Payment is awaited by EFT. Stock is reserved for 24 hours.'
          : 'Cash on delivery was accepted for this postcode.',
        actor: req.user,
        actorRole: 'buyer',
      });
      await order.save();
    } catch (error) {
      await restoreReserved(reserved);
      throw error;
    }

    try {
      req.user.cart = [];
      await req.user.save();
    } catch (error) {
      console.error('[cart] could not clear cart after checkout:', error.message);
    }

    res.status(201).json({ order: withOrderFlags(order) });
  }),
);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = { buyerId: req.user._id };
    if (req.query.paymentStatus) query['payment.status'] = req.query.paymentStatus;
    if (req.query.fulfilmentStatus) query['fulfilment.status'] = req.query.fulfilmentStatus;

    const orders = await Order.find(query)
      .populate('sellerId', 'name')
      .sort({ createdAt: -1 });
    res.json({ orders: orders.map(withOrderFlags) });
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!isObjectId(req.params.id)) throw notFound('That order could not be found.');
    const order = await Order.findById(req.params.id)
      .populate('sellerId', 'name')
      .populate('buyerId', 'name');
    if (!order) throw notFound('That order could not be found.');
    if (order.buyerId._id.toString() !== req.user._id.toString()) {
      throw forbidden('This order belongs to another buyer.');
    }

    const refunds = await Refund.find({ orderId: order._id }).sort({ createdAt: 1 });
    const items = [];
    for (const item of order.items) {
      const eligibility = await refundEligibility(order, item);
      const existing = refunds.find((refund) => refund.orderItemId === item._id.toString());
      items.push({
        ...item.toJSON(),
        refund: existing ? existing.toJSON() : null,
        refundEligible: eligibility.eligible,
        refundReason: eligibility.reason,
      });
    }

    const orderJson = withOrderFlags(order);
    orderJson.items = items;
    res.json({ order: orderJson, refunds });
  }),
);

router.post(
  '/:id/pay',
  asyncHandler(async (req, res) => {
    const { result } = parse(paySchema, req.body);
    if (!isObjectId(req.params.id)) throw notFound('That order could not be found.');
    const order = await Order.findById(req.params.id);
    if (!order) throw notFound('That order could not be found.');
    if (order.buyerId.toString() !== req.user._id.toString()) {
      throw forbidden('This order belongs to another buyer.');
    }
    if (order.payment.method !== 'eft') {
      throw new AppError(400, 'NOT_EFT', 'This order is not paid by EFT.');
    }
    if (['confirmed', 'paid'].includes(order.payment.status)) {
      return res.json({ order: withOrderFlags(order), message: 'Payment is already confirmed.' });
    }
    if (order.payment.status === 'expired') {
      throw new AppError(409, 'EFT_EXPIRED', 'This EFT reservation expired. Please place a new order.');
    }
    if (order.payment.status === 'awaiting_confirmation' && result === 'success') {
      return res.json({
        order: withOrderFlags(order),
        message: 'Payment is already awaiting confirmation.',
      });
    }

    order.payment.attempts += 1;
    if (result === 'success') {
      order.payment.status = 'awaiting_confirmation';
      order.payment.submittedAt = new Date();
      order.payment.lastResult = 'submitted';
      addOrderEvent(order, {
        type: 'payment_submitted',
        label: 'Simulated EFT payment submitted',
        note: 'Awaiting confirmation by the marketplace administrator.',
        actor: req.user,
        actorRole: 'buyer',
      });
    } else {
      order.payment.status = 'failed';
      order.payment.lastResult = 'failed';
      addOrderEvent(order, {
        type: 'payment_failed',
        label: 'Simulated EFT payment failed',
        note: 'The same order can be retried; no duplicate order was created.',
        actor: req.user,
        actorRole: 'buyer',
      });
    }
    await order.save();
    res.json({ order: withOrderFlags(order) });
  }),
);

router.post(
  '/:id/confirm-receipt',
  asyncHandler(async (req, res) => {
    if (!isObjectId(req.params.id)) throw notFound('That order could not be found.');
    const order = await Order.findById(req.params.id);
    if (!order) throw notFound('That order could not be found.');
    if (order.buyerId.toString() !== req.user._id.toString()) {
      throw forbidden('This order belongs to another buyer.');
    }
    if (order.fulfilment.status === 'delivered') {
      return res.json({ order: withOrderFlags(order), message: 'Receipt was already confirmed.' });
    }
    if (order.fulfilment.status !== 'dispatched') {
      throw new AppError(400, 'NOT_DISPATCHED', 'The seller has not dispatched this order yet.');
    }

    order.fulfilment.status = 'delivered';
    order.fulfilment.deliveredAt = new Date();
    addOrderEvent(order, {
      type: 'receipt_confirmed',
      label: 'Receipt confirmed by buyer',
      note:
        order.payment.method === 'cod'
          ? 'The parcel is delivered. Cash collection is recorded separately by the seller.'
          : 'The parcel was received. Payment was already confirmed.',
      actor: req.user,
      actorRole: 'buyer',
    });
    await order.save();
    res.json({ order: withOrderFlags(order) });
  }),
);

export default router;