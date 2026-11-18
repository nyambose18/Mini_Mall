import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema(
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

const orderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  title: { type: String, required: true },
  model: { type: String, default: '' },
  qty: { type: Number, required: true, min: 1 },
  unitPriceCents: { type: Number, required: true, min: 0 },
  lineTotalCents: { type: Number, required: true, min: 0 },
});

export const PAYMENT_STATUSES = [
  'awaiting_eft',
  'awaiting_confirmation',
  'confirmed',
  'failed',
  'expired',
  'due_on_delivery',
  'paid',
];

export const FULFILMENT_STATUSES = ['pending', 'dispatched', 'delivered'];

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: { type: [orderItemSchema], default: [] },
    delivery: {
      address: { type: String, required: true },
      postcode: { type: String, required: true },
      feeCents: { type: Number, required: true, min: 0 },
      workingDays: { type: Number, required: true, min: 1 },
      estimatedDate: { type: Date, required: true },
    },
    subtotalCents: { type: Number, required: true, min: 0 },
    totalCents: { type: Number, required: true, min: 0 },
    payment: {
      method: { type: String, enum: ['eft', 'cod'], required: true },
      status: { type: String, enum: PAYMENT_STATUSES, required: true },
      reference: { type: String, default: '' },
      attempts: { type: Number, default: 0 },
      submittedAt: { type: Date, default: null },
      confirmedAt: { type: Date, default: null },
      confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      collectedAt: { type: Date, default: null },
      collectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      expiresAt: { type: Date, default: null },
      lastResult: { type: String, default: '' },
    },
    fulfilment: {
      status: { type: String, enum: FULFILMENT_STATUSES, default: 'pending' },
      trackingNumber: { type: String, default: '' },
      dispatchedAt: { type: Date, default: null },
      deliveredAt: { type: Date, default: null },
    },
    refundedCents: { type: Number, default: 0, min: 0 },
    events: { type: [eventSchema], default: [] },
  },
  { timestamps: true },
);

export const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);