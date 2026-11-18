import mongoose from 'mongoose';
import { Order } from '../models/Order.js';
import { PENDING_PAYMENT_STATUSES, PAID_PAYMENT_STATUSES } from './orders.js';

function blankTotal() {
  return { amountCents: 0, count: 0 };
}

export async function salesSummary({ from, to, sellerId } = {}) {
  const match = {};
  if (from || to) {
    match.createdAt = {};
    if (from) match.createdAt.$gte = new Date(from);
    if (to) {
      const end = new Date(to);
      end.setUTCHours(23, 59, 59, 999);
      match.createdAt.$lte = end;
    }
  }
  if (sellerId) {
    if (!mongoose.isValidObjectId(sellerId)) {
      return null;
    }
    match.sellerId = new mongoose.Types.ObjectId(sellerId);
  }

  const orders = await Order.find(match)
    .select('orderNumber payment.status totalCents refundedCents sellerId createdAt')
    .populate('sellerId', 'name')
    .lean();

  const paid = blankTotal();
  const pending = blankTotal();
  const refunds = blankTotal();
  const sellers = new Map();

  for (const order of orders) {
    const sellerKey = order.sellerId?._id?.toString() || 'unknown';
    if (!sellers.has(sellerKey)) {
      sellers.set(sellerKey, {
        sellerId: sellerKey,
        sellerName: order.sellerId?.name || 'Unknown seller',
        paid: blankTotal(),
        pending: blankTotal(),
        refunds: blankTotal(),
        orderCount: 0,
      });
    }
    const seller = sellers.get(sellerKey);
    seller.orderCount += 1;

    if (PAID_PAYMENT_STATUSES.includes(order.payment.status)) {
      paid.amountCents += order.totalCents;
      paid.count += 1;
      seller.paid.amountCents += order.totalCents;
      seller.paid.count += 1;
    } else if (PENDING_PAYMENT_STATUSES.includes(order.payment.status)) {
      pending.amountCents += order.totalCents;
      pending.count += 1;
      seller.pending.amountCents += order.totalCents;
      seller.pending.count += 1;
    }

    if (order.refundedCents > 0) {
      refunds.amountCents += order.refundedCents;
      refunds.count += 1;
      seller.refunds.amountCents += order.refundedCents;
      seller.refunds.count += 1;
    }
  }

  return {
    from: from || null,
    to: to || null,
    paid,
    pending,
    refunds,
    orders: orders.length,
    perSeller: [...sellers.values()].sort((a, b) => a.sellerName.localeCompare(b.sellerName)),
  };
}