import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Product } from '../models/Product.js';
import { User } from '../models/User.js';

const sources = JSON.parse(fs.readFileSync(
  new URL('../../../client/public/images/photos/sources.json', import.meta.url),
  'utf8',
));
const photosByModel = new Map(sources.flatMap((source) =>
  source.models.map((model) => [model, `/images/photos/${source.file}`]),
));
const legacyImages = new Set([
  'board', 'cable', 'chassis', 'ethernet', 'gearmotor', 'limit-switch', 'motor-driver',
  'network-switch-8', 'network-switch', 'power', 'relay', 'router', 'sensor', 'stepper',
  'timing-belt', 'tool', 'wired-router', 'placeholder',
].map((name) => `/images/${name}.svg`));

export function productPhoto(model, fallback) {
  return photosByModel.get(model) || fallback;
}

export async function replaceSeedIllustrations() {
  const sellers = await User.find({
    email: { $in: ['lerato@minimall.test', 'sipho@minimall.test'] },
    role: 'seller',
  }).select('_id');
  const products = await Product.find({
    sellerId: { $in: sellers.map((seller) => seller._id) },
    model: { $in: [...photosByModel.keys()] },
    images: { $in: [...legacyImages] },
  }).select('images model');

  let updated = 0;
  for (const product of products) {
    const images = [...new Set(product.images.map((image) =>
      legacyImages.has(image) ? productPhoto(product.model) : image,
    ))];
    // Match the old array so a concurrent seller upload is never overwritten.
    const result = await Product.updateOne(
      { _id: product._id, images: product.images },
      { $set: { images } },
      { timestamps: false },
    );
    updated += result.modifiedCount;
  }
  return updated;
}

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isDirectRun) {
  const { connectDb, disconnectDb } = await import('../db.js');
  try {
    await connectDb();
    console.log('[photos] updated listings:', await replaceSeedIllustrations());
  } finally {
    await disconnectDb();
  }
}
