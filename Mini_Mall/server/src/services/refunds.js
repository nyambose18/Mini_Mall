import { config } from '../config.js';
import { Refund } from '../models/Refund.js';
import { isPast } from '../utils/time.js';

export async function findOpenRefund(orderId, itemId) {
  return Refund.findOne({
    orderId,
    orderItemId: itemId,
    status: { $ne: 'rejected' },
  });
}

export function refundWindowEndsAt(order) {
  if (!order.fulfilment.deliveredAt) return null;
  return new Date(
    new Date(order.fulfilment.deliveredAt).getTime() + config.refundWindowDays * 24 * 60 * 60 * 1000,
  );
}

export async function refundEligibility(order, item, now = new Date()) {
  if (!item) return { eligible: false, reason: 'That item is not part of this order.' };
  if (order.fulfilment.status !== 'delivered') {
    return { eligible: false, reason: 'Refunds can be requested after the parcel is delivered.' };
  }
  const endsAt = refundWindowEndsAt(order);
  if (!endsAt || isPast(endsAt, now)) {
    return {
      eligible: false,
      reason: `The ${config.refundWindowDays}-day request window for this order has closed.`,
    };
  }
  const existing = await findOpenRefund(order._id, String(item._id));
  if (existing) {
    return { eligible: false, reason: 'A refund case is already open for this item.' };
  }
  return { eligible: true, reason: '' };
}

export function addRefundEvent(refund, { type, label, note = '', actor = null, actorRole = 'system' }) {
  refund.events.push({
    type,
    label,
    note,
    actorId: actor?._id || null,
    actorRole,
    at: new Date(),
  });
}