import express from 'express';
import { z } from 'zod';
import { Product } from '../models/Product.js';
import { Order } from '../models/Order.js';
import { Refund } from '../models/Refund.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { AppError, asyncHandler, forbidden, notFound, parse } from '../utils/errors.js';
import { isObjectId } from '../utils/pricing.js';
import {
  addOrderEvent,
  canCollectCod,
  canDispatch,
  withOrderFlags,
} from '../services/orders.js';
import { addRefundEvent } from '../services/refunds.js';

const router = express.Router();

router.use(requireAuth, requireRole('seller'));

const productFieldsSchema = z.object({
  title: z.string().trim().max(120).optional(),
  model: z.string().trim().max(80).optional(),
  categoryId: z.string().trim().optional().nullable(),
  voltage: z.string().trim().max(80).optional(),
  connector: z.string().trim().max(120).optional(),
  compatibility: z.string().trim().max(300).optional(),
  contents: z.string().trim().max(300).optional(),
  description: z.string().trim().max(2000).optional(),
  priceCents: z.coerce.number().int().min(0).max(100000000).optional(),
  stock: z.coerce.number().int().min(0).max(100000).optional(),
  images: z.array(z.string().trim().min(1).max(500)).max(5).optional(),
});

const stockSchema = z.object({
  stock: z.coerce.number().int().min(0, 'Stock cannot be negative.').max(100000),
});

const dispatchSchema = z.object({
  trackingNumber: z.string().trim().min(2, 'Enter a tracking number.'),
});

const returnReceiptSchema = z.object({
  note: z.string().trim().max(500).optional().default('Returned item received by seller.'),
});

function ownedProduct(product, user) {
  return product.sellerId.toString() === user._id.toString();
}

function normalizeFields(input) {
  const fields = {};
  for (const key of [
    'title',
    'model',
    'voltage',
    'connector',
    'compatibility',
    'contents',
    'description',
    'priceCents',
    'stock',
    'images',
  ]) {
    if (input[key] !== undefined) fields[key] = input[key];
  }
  if (input.categoryId !== undefined) {
    if (input.categoryId && !isObjectId(input.categoryId)) {
      throw new AppError(400, 'VALIDATION', 'Choose a valid category.', {
        fields: { categoryId: 'Choose a valid category.' },
      });
    }
    fields.categoryId = input.categoryId || null;
  }
  return fields;
}

function missingListingFields(product) {
  const fields = {};
  const labels = {
    title: 'Title',
    model: 'Model',
    voltage: 'Voltage',
    connector: 'Connector',
    compatibility: 'Compatibility',
    contents: 'Contents',
  };
  for (const [key, label] of Object.entries(labels)) {
    if (!String(product[key] || '').trim()) fields[key] = `${label} is required.`;
  }
  if (!product.categoryId) fields.categoryId = 'Choose a category.';
  if (!Number.isInteger(product.priceCents) || product.priceCents <= 0) {
    fields.priceCents = 'Enter a price greater than R0.';
  }
  if (!Number.isInteger(product.stock) || product.stock < 0) {
    fields.stock = 'Enter the available stock.';
  }
  if (!product.images?.length) fields.images = 'Add at least one image.';
  return fields;
}

router.get(
  '/products',
  asyncHandler(async (req, res) => {
    const query = { sellerId: req.user._id };
    if (req.query.status) query.status = req.query.status;
    const products = await Product.find(query)
      .populate('categoryId', 'name slug')
      .sort({ updatedAt: -1 });
    res.json({ products });
  }),
);

router.post(
  '/products',
  asyncHandler(async (req, res) => {
    const input = parse(productFieldsSchema, req.body);
    const product = new Product({
      sellerId: req.user._id,
      ...normalizeFields(input),
      status: 'draft',
      images: input.images || [],
    });
    await product.save();
    res.status(201).json({ product });
  }),
);

router.get(
  '/products/:id',
  asyncHandler(async (req, res) => {
    if (!isObjectId(req.params.id)) throw notFound('That listing could not be found.');
    const product = await Product.findById(req.params.id).populate('categoryId', 'name slug');
    if (!product) throw notFound('That listing could not be found.');
    if (!ownedProduct(product, req.user)) throw forbidden('That listing belongs to another seller.');
    res.json({ product });
  }),
);

router.put(
  '/products/:id',
  asyncHandler(async (req, res) => {
    if (!isObjectId(req.params.id)) throw notFound('That listing could not be found.');
    const product = await Product.findById(req.params.id);
    if (!product) throw notFound('That listing could not be found.');
    if (!ownedProduct(product, req.user)) throw forbidden('That listing belongs to another seller.');
    if (product.status === 'delisted') {
      throw new AppError(409, 'DELISTED', 'A delisted product cannot be edited.');
    }

    const input = parse(productFieldsSchema, req.body);
    Object.assign(product, normalizeFields(input));

    // Editing a live listing removes it from sale until the administrator approves it again.
    if (['approved', 'delisting_requested'].includes(product.status)) {
      product.status = 'draft';
      product.reviewFeedback = '';
    }
    await product.save();
    res.json({ product });
  }),
);

router.patch(
  '/products/:id/stock',
  asyncHandler(async (req, res) => {
    if (!isObjectId(req.params.id)) throw notFound('That listing could not be found.');
    const { stock } = parse(stockSchema, req.body);
    const product = await Product.findById(req.params.id);
    if (!product) throw notFound('That listing could not be found.');
    if (!ownedProduct(product, req.user)) throw forbidden('That listing belongs to another seller.');
    if (product.status === 'delisted') {
      throw new AppError(409, 'DELISTED', 'A delisted product cannot be edited.');
    }

    product.stock = stock;
    await product.save();
    res.json({ product, message: stock === 0 ? 'Stock is zero, so buyers cannot add this item.' : 'Stock updated.' });
  }),
);

router.post(
  '/products/:id/submit',
  asyncHandler(async (req, res) => {
    if (!isObjectId(req.params.id)) throw notFound('That listing could not be found.');
    const product = await Product.findById(req.params.id);
    if (!product) throw notFound('That listing could not be found.');
    if (!ownedProduct(product, req.user)) throw forbidden('That listing belongs to another seller.');
    if (!['draft', 'changes_requested'].includes(product.status)) {
      throw new AppError(
        409,
        'INVALID_STATUS',
        'Only a draft or a corrected listing can be submitted for review.',
      );
    }

    const fields = missingListingFields(product);
    if (Object.keys(fields).length) {
      throw new AppError(
        400,
        'LISTING_INCOMPLETE',
        'Complete the required listing details before submitting.',
        { fields },
      );
    }

    product.status = 'pending';
    product.submittedAt = new Date();
    product.reviewFeedback = '';
    await product.save();
    res.json({ product, message: 'Submitted for administrator review.' });
  }),
);

router.post(
  '/products/:id/delist-request',
  asyncHandler(async (req, res) => {
    if (!isObjectId(req.params.id)) throw notFound('That listing could not be found.');
    const product = await Product.findById(req.params.id);
    if (!product) throw notFound('That listing could not be found.');
    if (!ownedProduct(product, req.user)) throw forbidden('That listing belongs to another seller.');
    if (product.status === 'delisting_requested') {
      return res.json({ product, message: 'A delisting request is already waiting for review.' });
    }
    if (product.status !== 'approved') {
      throw new AppError(409, 'INVALID_STATUS', 'Only an approved listing can be delisted.');
    }
    product.status = 'delisting_requested';
    await product.save();
    res.json({ product, message: 'Delisting request sent to the administrator.' });
  }),
);

router.get(
  '/orders',
  asyncHandler(async (req, res) => {
    const query = { sellerId: req.user._id };
    if (req.query.paymentStatus) query['payment.status'] = req.query.paymentStatus;
    if (req.query.fulfilmentStatus) query['fulfilment.status'] = req.query.fulfilmentStatus;
    const orders = await Order.find(query)
      .populate('buyerId', 'name')
      .sort({ createdAt: -1 });
    res.json({ orders: orders.map(withOrderFlags) });
  }),
);

router.post(
  '/orders/:id/dispatch',
  asyncHandler(async (req, res) => {
    if (!isObjectId(req.params.id)) throw notFound('That order could not be found.');
    const { trackingNumber } = parse(dispatchSchema, req.body);
    const order = await Order.findById(req.params.id);
    if (!order) throw notFound('That order could not be found.');
    if (order.sellerId.toString() !== req.user._id.toString()) {
      throw forbidden('That order belongs to another seller.');
    }
    if (order.fulfilment.status !== 'pending') {
      throw new AppError(409, 'ALREADY_DISPATCHED', 'This order has already been dispatched or delivered.');
    }
    if (!canDispatch(order)) {
      throw new AppError(
        409,
        'DISPATCH_BLOCKED',
        order.payment.method === 'eft'
          ? 'Dispatch is blocked until the EFT payment is confirmed.'
          : 'This order is not eligible for dispatch.',
      );
    }

    order.fulfilment.status = 'dispatched';
    order.fulfilment.trackingNumber = trackingNumber;
    order.fulfilment.dispatchedAt = new Date();
    addOrderEvent(order, {
      type: 'dispatched',
      label: 'Order dispatched',
      note: `Tracking number: ${trackingNumber}`,
      actor: req.user,
      actorRole: 'seller',
    });
    await order.save();
    res.json({ order: withOrderFlags(order) });
  }),
);

router.post(
  '/orders/:id/collect-cod',
  asyncHandler(async (req, res) => {
    if (!isObjectId(req.params.id)) throw notFound('That order could not be found.');
    const order = await Order.findById(req.params.id);
    if (!order) throw notFound('That order could not be found.');
    if (order.sellerId.toString() !== req.user._id.toString()) {
      throw forbidden('That order belongs to another seller.');
    }
    if (order.payment.method !== 'cod') {
      throw new AppError(400, 'NOT_COD', 'This order is not a cash-on-delivery order.');
    }
    if (order.payment.status === 'paid') {
      return res.json({ order: withOrderFlags(order), message: 'Cash collection is already recorded.' });
    }
    if (!canCollectCod(order)) {
      throw new AppError(
        400,
        'NOT_COLLECTABLE',
        'Cash can only be recorded after the buyer has confirmed delivery.',
      );
    }

    order.payment.status = 'paid';
    order.payment.collectedAt = new Date();
    order.payment.collectedBy = req.user._id;
    order.payment.lastResult = 'collected';
    addOrderEvent(order, {
      type: 'cod_collected',
      label: 'Simulated COD cash collection recorded',
      note: 'Delivery and payment are separate events; cash was recorded after receipt.',
      actor: req.user,
      actorRole: 'seller',
    });
    await order.save();
    res.json({ order: withOrderFlags(order) });
  }),
);

router.get(
  '/refunds',
  asyncHandler(async (req, res) => {
    const query = { sellerId: req.user._id };
    if (req.query.status) query.status = req.query.status;
    const refunds = await Refund.find(query)
      .populate('orderId', 'orderNumber fulfilment.status')
      .populate('buyerId', 'name')
      .sort({ createdAt: -1 });
    res.json({ refunds });
  }),
);

router.post(
  '/refunds/:id/return-received',
  asyncHandler(async (req, res) => {
    if (!isObjectId(req.params.id)) throw notFound('That refund case could not be found.');
    const { note } = parse(returnReceiptSchema, req.body ?? {});
    const refund = await Refund.findById(req.params.id);
    if (!refund) throw notFound('That refund case could not be found.');
    if (refund.sellerId.toString() !== req.user._id.toString()) {
      throw forbidden('That refund case belongs to another seller.');
    }
    if (['return_received', 'refunded'].includes(refund.status)) {
      return res.json({ refund, message: 'Returned-item receipt is already recorded.' });
    }
    if (refund.status !== 'awaiting_return') {
      throw new AppError(409, 'INVALID_STATUS', 'This case is not waiting for a returned item.');
    }

    refund.status = 'return_received';
    addRefundEvent(refund, {
      type: 'return_received',
      label: 'Returned item received by seller',
      note,
      actor: req.user,
      actorRole: 'seller',
    });
    await refund.save();
    res.json({
      refund,
      message: 'Return recorded. The administrator still completes the simulated refund.',
    });
  }),
);

export default router;