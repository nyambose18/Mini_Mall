import express from 'express';
import { Category } from '../models/Category.js';
import { Product, PUBLIC_PRODUCT_STATUSES } from '../models/Product.js';
import { asyncHandler, notFound } from '../utils/errors.js';
import { escapeRegex } from '../utils/text.js';
import { isObjectId } from '../utils/pricing.js';

const router = express.Router();

async function categoryFilter(value) {
  if (!value) return null;
  const query = [{ slug: String(value).toLowerCase() }];
  if (isObjectId(value)) query.push({ _id: value });
  return Category.findOne({ $or: query });
}

router.get(
  '/products',
  asyncHandler(async (req, res) => {
    const { search = '', category = '' } = req.query;
    const query = { status: { $in: PUBLIC_PRODUCT_STATUSES } };

    if (String(search).trim()) {
      const pattern = new RegExp(escapeRegex(String(search).trim()), 'i');
      query.$or = [{ title: pattern }, { model: pattern }, { compatibility: pattern }];
    }

    if (category) {
      const found = await categoryFilter(category);
      if (!found) return res.json({ products: [] });
      query.categoryId = found._id;
    }

    const products = await Product.find(query)
      .populate('categoryId', 'name slug')
      .populate('sellerId', 'name')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ products });
  }),
);

router.get(
  '/products/:id',
  asyncHandler(async (req, res) => {
    if (!isObjectId(req.params.id)) throw notFound('That product could not be found.');
    const product = await Product.findOne({
      _id: req.params.id,
      status: { $in: PUBLIC_PRODUCT_STATUSES },
    })
      .populate('categoryId', 'name slug')
      .populate('sellerId', 'name');
    if (!product) throw notFound('That product is not available.');
    res.json({ product });
  }),
);

router.get(
  '/categories',
  asyncHandler(async (_req, res) => {
    const categories = await Category.find({ active: true }).sort({ name: 1 });
    res.json({ categories });
  }),
);

router.get(
  '/home',
  asyncHandler(async (_req, res) => {
    const [categories, featured] = await Promise.all([
      Category.find({ active: true }).sort({ name: 1 }),
      Product.find({ status: { $in: PUBLIC_PRODUCT_STATUSES } })
        .populate('categoryId', 'name slug')
        .populate('sellerId', 'name')
        .sort({ createdAt: -1 })
        .limit(6),
    ]);
    res.json({ categories, featured });
  }),
);

export default router;