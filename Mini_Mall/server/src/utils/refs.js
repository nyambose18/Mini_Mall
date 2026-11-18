import crypto from 'node:crypto';
import { Counter } from '../models/Counter.js';

export async function nextOrderNumber(now = new Date()) {
  const year = now.getUTCFullYear();
  const counter = await Counter.findOneAndUpdate(
    { name: `order-${year}` },
    { $inc: { value: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  return `MM-${year}-${String(counter.value).padStart(4, '0')}`;
}

export function eftReference() {
  return `EFT-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}