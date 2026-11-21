import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    qty: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['buyer', 'seller', 'admin'], required: true },
    sellerStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: function sellerStatus() { return this.role === 'seller' ? 'pending' : undefined; },
    },
    companyName: { type: String, trim: true, default: '' },
    sellerReviewedAt: { type: Date, default: null },
    sellerReviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    sellerReviewReason: { type: String, default: '' },
    phone: { type: String, default: '' },
    address: { type: String, default: '' },
    postcode: { type: String, default: '' },
    cart: { type: [cartItemSchema], default: [] },
  },
  { timestamps: true },
);

userSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    role: this.role,
    phone: this.phone,
    address: this.address,
    postcode: this.postcode,
    ...(this.role === 'seller' ? {
      companyName: this.companyName,
      sellerStatus: this.sellerStatus,
      sellerReviewReason: this.sellerReviewReason,
    } : {}),
  };
};

export const User = mongoose.models.User || mongoose.model('User', userSchema);
