import { config } from '../config.js';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { workingDaysBetween } from '../utils/time.js';

export const PAID_PAYMENT_STATUSES = ['confirmed', 'paid'];
export const PENDING_PAYMENT_STATUSES = [
  'awaiting_eft',
  'awaiting_confirmation',
  'failed',
  'expired',
  'due_on_delivery',
];

export function paymentIsPaid(order) {
  return PAID_PAYMENT_STATUSES.includes(order.payment.status);
}

export function canDispatch(order) {
  if (order.fulfilment.status !== 'pending') return false;
  if (order.payment.method === 'eft') return order.payment.status === 'confirmed';
  return ['due_on_delivery', 'paid'].includes(order.payment.status);
}

export function overdueReason(order, now = new Date()) {
  if (order.fulfilment.status !== 'pending') return '';
  if (order.payment.method !== 'cod') return '';
  if (!['due_on_delivery', 'paid'].includes(order.payment.status)) return '';
  const elapsed = workingDaysBetween(order.createdAt, now);
  if (elapsed > config.codDispatchWorkingDays) {
    return `COD order has waited ${elapsed} working days without dispatch.`;
  }
  return '';
}

export function isOverdue(order, now = new Date()) {
  return Boolean(overdueReason(order, now));
}

export function canCollectCod(order) {
  return (
    order.payment.method === 'cod' &&
    order.fulfilment.status === 'delivered' &&
    order.payment.status === 'due_on_delivery'
  );
}

export function addOrderEvent(order, { type, label, note = '', actor = null, actorRole = 'system' }) {
  order.events.push({
    type,
    label,
    note,
    actorId: actor?._id || null,
    actorRole,
    at: new Date(),
  });
}

export function withOrderFlags(order) {
  const json = order.toJSON();
  const overdue = overdueReason(order);
  return {
    ...json,
    canDispatch: canDispatch(order),
    canCollectCod: canCollectCod(order),
    canConfirmReceipt: order.fulfilment.status === 'dispatched',
    overdue: Boolean(overdue),
    overdueReason: overdue,
  };
}

export async function releaseExpiredEftOrders(now = new Date()) {
  const expired = await Order.find({
    'payment.method': 'eft',
    'payment.status': { $in: ['awaiting_eft', 'awaiting_confirmation'] },
    'payment.expiresAt': { $lte: now },
    'fulfilment.status': 'pending',
  });

  for (const order of expired) {
    for (const item of order.items) {
      await Product.updateOne({ _id: item.productId }, { $inc: { stock: item.qty } });
    }
    order.payment.status = 'expired';
    order.payment.lastResult = 'expired';
    addOrderEvent(order, {
      type: 'payment_expired',
      label: 'EFT reservation expired',
      note: 'The 24-hour EFT window ended and the reserved stock was released.',
    });
    await order.save();
  }

  return expired.length;
}

export function eftExpiryDate(from = new Date()) {
  return new Date(from.getTime() + config.eftExpiryHours * 60 * 60 * 1000);
}