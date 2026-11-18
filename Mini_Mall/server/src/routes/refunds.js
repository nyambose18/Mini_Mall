import express from 'express';
import { z } from 'zod';
import { Order } from '../models/Order.js';
import { Refund } from '../models/Refund.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { AppError, asyncHandler, forbidden, notFound, parse } from '../utils/errors.js';
import { isObjectId } from '../utils/pricing.js';
import {
  addRefundEvent,
  findOpenRefund,
  refundEligibility,
} from '../services/refunds.js';

const router = express.Router();

router.use(requireAuth);

const requestSchema = z.object({
  orderId: z.string(),
  itemId: z.string(),
  reason: z.string().trim().min(5, 'Explain what went wrong.'),
  imageUrl: z.string().trim().max(500).optional().default(''),
});

function referenceId(reference) {
  return (reference?._id || reference)?.toString();
}

function canView(refund, user) {
  if (user.role === 'admin') return true;
  if (user.role === 'buyer') return referenceId(refund.buyerId) === user._id.toString();
  if (user.role === 'seller') return referenceId(refund.sellerId) === user._id.toString();
  return false;
}

router.post(
  '/',
  requireRole('buyer'),
  asyncHandler(async (req, res) => {
    const input = parse(requestSchema, req.body);
    if (!isObjectId(input.orderId)) throw notFound('That order could not be found.');

    const order = await Order.findOne({ _id: input.orderId, buyerId: req.user._id });
    if (!order) throw notFound('That order could not be found.');

    const item = order.items.id(input.itemId);
    if (!item) throw notFound('That item is not part of this order.');

    const existing = await findOpenRefund(order._id, String(item._id));
    if (existing) {
      throw new AppError(409, 'REFUND_EXISTS', 'A refund case is already open for this item.');
    }

    const eligibility = await refundEligibility(order, item);
    if (!eligibility.eligible) {
      throw new AppError(409, 'REFUND_NOT_ELIGIBLE', eligibility.reason);
    }

    const refund = new Refund({
      orderId: order._id,
      orderItemId: item._id.toString(),
      productId: item.productId,
      buyerId: req.user._id,
      sellerId: order.sellerId,
      reason: input.reason,
      imageUrl: input.imageUrl,
      amountCents: item.lineTotalCents,
      status: 'requested',
    });
    addRefundEvent(refund, {
      type: 'refund_requested',
      label: 'Refund requested',
      note: input.reason,
      actor: req.user,
      actorRole: 'buyer',
    });
    await refund.save();

    res.status(201).json({ refund });
  }),
);

router.get(
  '/',
  requireRole('buyer'),
  asyncHandler(async (req, res) => {
    const refunds = await Refund.find({ buyerId: req.user._id })
      .populate('orderId', 'orderNumber')
      .sort({ createdAt: -1 });
    res.json({ refunds });
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!isObjectId(req.params.id)) throw notFound('That refund case could not be found.');
    const refund = await Refund.findById(req.params.id)
      .populate('buyerId', 'name email')
      .populate('sellerId', 'name')
      .populate('productId', 'title model');
    if (!refund) throw notFound('That refund case could not be found.');
    if (!canView(refund, req.user)) throw forbidden('This refund case belongs to someone else.');

    const order = await Order.findById(refund.orderId);
    res.json({ refund, order });
  }),
);

export default router;