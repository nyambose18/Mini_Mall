import express from 'express';
import { z } from 'zod';
import { Product, PRODUCT_STATUSES } from '../models/Product.js';
import { Category } from '../models/Category.js';
import { Order } from '../models/Order.js';
import { Refund } from '../models/Refund.js';
import { User } from '../models/User.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { AppError, asyncHandler, notFound, parse } from '../utils/errors.js';
import { isObjectId } from '../utils/pricing.js';
import { slugify } from '../utils/text.js';
import { addOrderEvent, withOrderFlags } from '../services/orders.js';
import { addRefundEvent } from '../services/refunds.js';
import { salesSummary } from '../services/stats.js';

const router = express.Router();

router.use(requireAuth, requireRole('admin'));

const feedbackSchema = z.object({
  feedback: z.string().trim().min(3, 'Explain what the seller must correct.').max(1000),
});

const categorySchema = z.object({
  name: z.string().trim().min(2, 'Enter a category name.').max(80),
  active: z.boolean().optional(),
});

const decideSchema = z
  .object({
    decision: z.enum(['approve', 'reject']),
    reason: z.string().trim().max(500).optional().default(''),
  })
  .superRefine((value, ctx) => {
    if (value.decision === 'reject' && value.reason.length < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['reason'],
        message: 'Explain why the refund was rejected.',
      });
    }
  });

const TAB_STATUS = {
  pending: 'pending',
  changes: 'changes_requested',
  delisting: 'delisting_requested',
  all: null,
};

router.get(
  '/catalogue',
  asyncHandler(async (req, res) => {
    const tab = TAB_STATUS[req.query.tab] !== undefined ? req.query.tab : 'pending';
    const status = TAB_STATUS[tab];
    const query = status ? { status } : { status: { $in: PRODUCT_STATUSES } };

    const [products, grouped] = await Promise.all([
      Product.find(query)
        .populate('sellerId', 'name email')
        .populate('categoryId', 'name slug')
        .sort({ submittedAt: 1, updatedAt: -1 }),
      Product.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);

    const counts = Object.fromEntries(PRODUCT_STATUSES.map((statusName) => [statusName, 0]));
    for (const row of grouped) counts[row._id] = row.count;

    res.json({ products, counts, tab });
  }),
);

router.post(
  '/products/:id/approve',
  asyncHandler(async (req, res) => {
    if (!isObjectId(req.params.id)) throw notFound('That listing could not be found.');
    const product = await Product.findById(req.params.id);
    if (!product) throw notFound('That listing could not be found.');
    if (product.status === 'approved') {
      return res.json({ product, message: 'This listing is already approved.' });
    }
    if (product.status !== 'pending') {
      throw new AppError(409, 'INVALID_STATUS', 'Only a pending listing can be approved.');
    }

    product.status = 'approved';
    product.approvedAt = new Date();
    product.reviewFeedback = '';
    await product.save();
    res.json({ product, message: 'Listing approved and published.' });
  }),
);

router.post(
  '/products/:id/request-changes',
  asyncHandler(async (req, res) => {
    if (!isObjectId(req.params.id)) throw notFound('That listing could not be found.');
    const { feedback } = parse(feedbackSchema, req.body);
    const product = await Product.findById(req.params.id);
    if (!product) throw notFound('That listing could not be found.');
    if (product.status !== 'pending') {
      throw new AppError(409, 'INVALID_STATUS', 'Only a pending listing can receive changes.');
    }

    product.status = 'changes_requested';
    product.reviewFeedback = feedback;
    await product.save();
    res.json({ product, message: 'Feedback sent to the seller.' });
  }),
);

router.post(
  '/products/:id/delist',
  asyncHandler(async (req, res) => {
    if (!isObjectId(req.params.id)) throw notFound('That listing could not be found.');
    const product = await Product.findById(req.params.id);
    if (!product) throw notFound('That listing could not be found.');
    if (product.status === 'delisted') {
      return res.json({ product, message: 'This listing is already delisted.' });
    }
    if (product.status !== 'delisting_requested') {
      throw new AppError(409, 'INVALID_STATUS', 'Only a delisting request can be approved.');
    }

    product.status = 'delisted';
    product.delistedAt = new Date();
    await product.save();
    res.json({ product, message: 'Listing delisted and removed from the catalogue.' });
  }),
);

router.get(
  '/categories',
  asyncHandler(async (_req, res) => {
    const categories = await Category.find().sort({ name: 1 });
    res.json({ categories });
  }),
);

router.post(
  '/categories',
  asyncHandler(async (req, res) => {
    const { name } = parse(categorySchema, req.body);
    const category = await Category.create({ name, slug: slugify(name), active: true });
    res.status(201).json({ category });
  }),
);

router.patch(
  '/categories/:id',
  asyncHandler(async (req, res) => {
    if (!isObjectId(req.params.id)) throw notFound('That category could not be found.');
    const input = parse(categorySchema.partial(), req.body);
    const category = await Category.findById(req.params.id);
    if (!category) throw notFound('That category could not be found.');

    if (input.name !== undefined) {
      category.name = input.name;
      category.slug = slugify(input.name);
    }
    if (input.active !== undefined) category.active = input.active;
    await category.save();
    res.json({ category });
  }),
);

router.get(
  '/orders',
  asyncHandler(async (req, res) => {
    const query = {};
    if (req.query.paymentStatus) query['payment.status'] = req.query.paymentStatus;
    if (req.query.fulfilmentStatus) query['fulfilment.status'] = req.query.fulfilmentStatus;
    if (req.query.sellerId) {
      if (!isObjectId(req.query.sellerId)) {
        throw new AppError(400, 'INVALID_SELLER', 'Choose a valid seller.');
      }
      query.sellerId = req.query.sellerId;
    }

    const orders = await Order.find(query)
      .populate('buyerId', 'name email')
      .populate('sellerId', 'name')
      .sort({ createdAt: -1 });

    let views = orders.map(withOrderFlags);
    if (req.query.overdue === 'true' || req.query.overdue === '1') {
      views = views.filter((order) => order.overdue);
    }
    res.json({ orders: views });
  }),
);

router.post(
  '/orders/:id/confirm-eft',
  asyncHandler(async (req, res) => {
    if (!isObjectId(req.params.id)) throw notFound('That order could not be found.');
    const order = await Order.findById(req.params.id);
    if (!order) throw notFound('That order could not be found.');
    if (order.payment.method !== 'eft') {
      throw new AppError(400, 'NOT_EFT', 'This order is not paid by EFT.');
    }
    if (['confirmed', 'paid'].includes(order.payment.status)) {
      return res.json({ order: withOrderFlags(order), message: 'Payment is already confirmed.' });
    }
    if (!['awaiting_eft', 'awaiting_confirmation'].includes(order.payment.status)) {
      throw new AppError(
        409,
        'PAYMENT_NOT_CONFIRMABLE',
        'This payment cannot be confirmed in its current state.',
      );
    }

    order.payment.status = 'confirmed';
    order.payment.confirmedAt = new Date();
    order.payment.confirmedBy = req.user._id;
    addOrderEvent(order, {
      type: 'eft_confirmed',
      label: 'Simulated EFT confirmed',
      note: 'The administrator matched the demo reference. Dispatch is now permitted.',
      actor: req.user,
      actorRole: 'admin',
    });
    await order.save();
    res.json({ order: withOrderFlags(order) });
  }),
);

router.get(
  '/refunds',
  asyncHandler(async (req, res) => {
    const query = {};
    if (req.query.status) query.status = req.query.status;
    const refunds = await Refund.find(query)
      .populate('orderId', 'orderNumber totalCents fulfilment.status')
      .populate('buyerId', 'name email')
      .populate('sellerId', 'name')
      .sort({ createdAt: 1 });
    res.json({ refunds });
  }),
);

router.post(
  '/refunds/:id/decide',
  asyncHandler(async (req, res) => {
    if (!isObjectId(req.params.id)) throw notFound('That refund case could not be found.');
    const { decision, reason } = parse(decideSchema, req.body);
    const refund = await Refund.findById(req.params.id);
    if (!refund) throw notFound('That refund case could not be found.');
    if (refund.status !== 'requested') {
      throw new AppError(409, 'INVALID_STATUS', 'This refund case has already been decided.');
    }

    refund.status = decision === 'approve' ? 'awaiting_return' : 'rejected';
    refund.decisionReason = reason;
    refund.decidedBy = req.user._id;
    refund.decidedAt = new Date();
    addRefundEvent(refund, {
      type: decision === 'approve' ? 'refund_approved' : 'refund_rejected',
      label: decision === 'approve' ? 'Refund approved' : 'Refund rejected',
      note: reason,
      actor: req.user,
      actorRole: 'admin',
    });
    await refund.save();
    res.json({ refund });
  }),
);

router.post(
  '/refunds/:id/complete',
  asyncHandler(async (req, res) => {
    if (!isObjectId(req.params.id)) throw notFound('That refund case could not be found.');
    const refund = await Refund.findById(req.params.id);
    if (!refund) throw notFound('That refund case could not be found.');
    if (refund.status === 'refunded') {
      return res.json({ refund, message: 'This refund is already completed.' });
    }
    if (refund.status !== 'return_received') {
      throw new AppError(
        409,
        'RETURN_NOT_RECORDED',
        'The seller must record the returned item before the refund can be completed.',
      );
    }

    refund.status = 'refunded';
    refund.completedAt = new Date();
    addRefundEvent(refund, {
      type: 'refund_completed',
      label: 'Simulated refund completed',
      note: 'No real money was transferred; this is a teaching demonstration.',
      actor: req.user,
      actorRole: 'admin',
    });
    await refund.save();

    const order = await Order.findById(refund.orderId);
    if (order) {
      order.refundedCents += refund.amountCents;
      addOrderEvent(order, {
        type: 'refund_completed',
        label: 'Refund completed',
        note: `Simulated refund of R${(refund.amountCents / 100).toFixed(2)} for one item.`,
        actor: req.user,
        actorRole: 'admin',
      });
      await order.save();
    }

    res.json({ refund });
  }),
);

router.get(
  '/sellers',
  asyncHandler(async (_req, res) => {
    const sellers = await User.find({ role: 'seller' }).select('name email');
    res.json({ sellers });
  }),
);

router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const { from, to, sellerId } = req.query;
    if (from && Number.isNaN(new Date(from).getTime())) {
      throw new AppError(400, 'INVALID_DATE', 'Enter a valid start date.');
    }
    if (to && Number.isNaN(new Date(to).getTime())) {
      throw new AppError(400, 'INVALID_DATE', 'Enter a valid end date.');
    }
    const summary = await salesSummary({ from, to, sellerId });
    if (!summary) throw new AppError(400, 'INVALID_SELLER', 'Choose a valid seller.');
    res.json({ summary });
  }),
);

export default router;