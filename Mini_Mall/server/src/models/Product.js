import mongoose from 'mongoose';

export const PRODUCT_STATUSES = [
  'draft',
  'pending',
  'changes_requested',
  'approved',
  'delisting_requested',
  'delisted',
];

// A live listing stays purchasable while its delisting request is reviewed.
export const PUBLIC_PRODUCT_STATUSES = ['approved', 'delisting_requested'];

const productSchema = new mongoose.Schema(
  {
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    model: { type: String, default: '', trim: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    voltage: { type: String, default: '', trim: true },
    connector: { type: String, default: '', trim: true },
    compatibility: { type: String, default: '', trim: true },
    contents: { type: String, default: '', trim: true },
    description: { type: String, default: '', trim: true },
    priceCents: { type: Number, default: 0, min: 0, validate: Number.isInteger },
    stock: { type: Number, default: 0, min: 0, validate: Number.isInteger },
    images: { type: [String], default: [] },
    status: { type: String, enum: PRODUCT_STATUSES, default: 'draft', index: true },
    reviewFeedback: { type: String, default: '' },
    submittedAt: { type: Date, default: null },
    approvedAt: { type: Date, default: null },
    delistedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

productSchema.index({ status: 1, categoryId: 1 });

export const Product = mongoose.models.Product || mongoose.model('Product', productSchema);