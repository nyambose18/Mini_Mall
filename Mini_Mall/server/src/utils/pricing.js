import mongoose from 'mongoose';
import { config } from '../config.js';
import { addWorkingDays } from './time.js';

export function normalizePostcode(value) {
  return String(value || '').replace(/\s+/g, '').trim();
}

export function isValidPostcode(value) {
  return /^\d{4}$/.test(normalizePostcode(value));
}

export function isCodEligible(postcode, allowed = config.codEligiblePostcodes) {
  return allowed.includes(normalizePostcode(postcode));
}

export function deliveryFeeFor(
  postcode,
  baseFee = config.deliveryFeeCents,
  outlyingFee = config.outlyingDeliveryFeeCents,
) {
  const normalized = normalizePostcode(postcode);
  if (!isValidPostcode(normalized)) return null;
  // Postcodes starting 5-9 are treated as outlying for this teaching demo.
  return Number(normalized[0]) >= 5 ? outlyingFee : baseFee;
}

export function workingDaysFor(postcode) {
  const normalized = normalizePostcode(postcode);
  if (!isValidPostcode(normalized)) return null;
  const estimates = { 0: 2, 1: 2, 2: 2, 3: 3, 4: 3, 5: 4, 6: 4, 7: 5, 8: 5, 9: 5 };
  return estimates[Number(normalized[0])];
}

export function codAvailableFor(postcode) {
  return isCodEligible(normalizePostcode(postcode));
}

export function quoteFor(postcode, from = new Date()) {
  const normalized = normalizePostcode(postcode);
  if (!isValidPostcode(normalized)) return null;

  const workingDays = workingDaysFor(normalized);
  return {
    postcode: normalized,
    feeCents: deliveryFeeFor(normalized),
    workingDays,
    estimatedDate: addWorkingDays(from, workingDays).toISOString(),
    codEligible: codAvailableFor(normalized),
  };
}

export function isObjectId(value) {
  return mongoose.isValidObjectId(value) && String(value).length === 24;
}