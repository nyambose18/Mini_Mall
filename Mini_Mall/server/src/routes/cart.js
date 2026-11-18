import express from 'express';
import { z } from 'zod';
import { Product, PUBLIC_PRODUCT_STATUSES } from '../models/Product.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { AppError, asyncHandler, parse } from '../utils/errors.js';
import { isObjectId } from '../utils/pricing.js';
import { buildCart } from '../services/cart.js';

const router = express.Router();

router.use(requireAuth, requireRole('buyer'));

const addSchema = z.object({
  productId: z.string(),
  qty: z.coerce.number().int().min(1).max(99).default(1),
});

const updateSchema = z.object({
  qty: z.coerce.number().int().min(1).max(99),
});

router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json({ cart: await buildCart(req.user) });
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { productId, qty } = parse(addSchema, req.body);
    if (!isObjectId(productId)) {
      throw new AppError(404, 'NOT_FOUND', 'That product could not be found.');
    }

    const product = await Product.findOne({
      _id: productId,
      status: { $in: PUBLIC_PRODUCT_STATUSES },
    });
    if (!product) throw new AppError(404, 'NOT_FOUND', 'That product is not available.');
    if (product.stock < 1) {
      throw new AppError(409, 'OUT_OF_STOCK', 'That product is out of stock.');
    }

    const existing = req.user.cart.find((entry) => entry.productId.toString() === productId);
    const requested = existing ? existing.qty + qty : qty;
    const nextQty = Math.min(requested, product.stock);
    if (existing) {
      existing.qty = nextQty;
    } else {
      req.user.cart.push({ productId: product._id, qty: nextQty });
    }
    await req.user.save();

    const capped = nextQty < requested;
    res.status(201).json({
      cart: await buildCart(req.user),
      message: capped
        ? `Only ${product.stock} of this item are in stock, so the cart was capped.`
        : '',
    });
  }),
);

router.patch(
  '/:productId',
  asyncHandler(async (req, res) => {
    const { qty } = parse(updateSchema, req.body);
    const { productId } = req.params;
    const product = await Product.findById(productId);
    if (!product) throw new AppError(404, 'NOT_FOUND', 'That product could not be found.');

    const entry = req.user.cart.find((item) => item.productId.toString() === productId);
    if (!entry) throw new AppError(404, 'NOT_FOUND', 'That item is not in your cart.');
    if (qty > product.stock) {
      throw new AppError(409, 'STOCK_LIMIT', `Only ${product.stock} of this item are in stock.`);
    }

    entry.qty = qty;
    await req.user.save();
    res.json({ cart: await buildCart(req.user) });
  }),
);

router.delete(
  '/:productId',
  asyncHandler(async (req, res) => {
    req.user.cart = req.user.cart.filter(
      (entry) => entry.productId.toString() !== req.params.productId,
    );
    await req.user.save();
    res.json({ cart: await buildCart(req.user) });
  }),
);

router.delete(
  '/',
  asyncHandler(async (req, res) => {
    req.user.cart = [];
    await req.user.save();
    res.json({ cart: await buildCart(req.user) });
  }),
);

export default router;