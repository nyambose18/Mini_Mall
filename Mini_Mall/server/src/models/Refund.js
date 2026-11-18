import mongoose from 'mongoose';

const refundEventSchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    label: { type: String, required: true },
    note: { type: String, default: '' },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    actorRole: { type: String, default: 'system' },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

export const REFUND_STATUSES = [
  'requested',
  'awaiting_return',
  'rejected',
  'return_received',
  'refunded',
];

const refundSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    orderItemId: { type: String, required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    reason: { type: String, required: true, trim: true },
    imageUrl: { type: String, default: '' },
    amountCents: { type: Number, required: true, min: 0 },
    status: { type: String, enum: REFUND_STATUSES, default: 'requested', index: true },
    decisionReason: { type: String, default: '' },
    decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    decidedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    events: { type: [refundEventSchema], default: [] },
  },
  { timestamps: true },
);

refundSchema.index({ orderId: 1, orderItemId: 1 });

export const Refund = mongoose.models.Refund || mongoose.model('Refund', refundSchema);