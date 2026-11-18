import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createCategory,
  createOrder,
  createProduct,
  createUser,
  daysAgo,
  loginAgent,
  resetDb,
  startTestDb,
  stopTestDb,
} from './helpers.js';
import { Order } from '../src/models/Order.js';
import { Product } from '../src/models/Product.js';
import { releaseExpiredEftOrders } from '../src/services/orders.js';

before(startTestDb);
after(stopTestDb);
beforeEach(resetDb);

async function scenario({ payment, fulfilment = 'pending', createdAt = daysAgo(2) } = {}) {
  const buyer = await createUser({ role: 'buyer' });
  const seller = await createUser({ role: 'seller' });
  const admin = await createUser({ role: 'admin' });
  const category = await createCategory();
  const product = await createProduct({ seller, category });
  const order = await createOrder({
    buyer,
    seller,
    product,
    qty: 1,
    payment,
    fulfilment,
    createdAt,
  });
  const sellerAgent = await loginAgent(seller.email);
  const buyerAgent = await loginAgent(buyer.email);
  const adminAgent = await loginAgent(admin.email);
  return { buyer, seller, admin, product, order, sellerAgent, buyerAgent, adminAgent };
}

test('dispatch is blocked while EFT is unconfirmed', async () => {
  const { order, sellerAgent } = await scenario({
    payment: {
      method: 'eft',
      status: 'awaiting_eft',
      reference: 'EFT-BLOCKED',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  const blocked = await sellerAgent
    .post(`/api/seller/orders/${order.id}/dispatch`)
    .send({ trackingNumber: 'TRACK-1' })
    .expect(409);
  assert.equal(blocked.body.error.code, 'DISPATCH_BLOCKED');
});

test('admin confirmation releases the order for dispatch', async () => {
  const { order, sellerAgent, adminAgent } = await scenario({
    payment: {
      method: 'eft',
      status: 'awaiting_confirmation',
      reference: 'EFT-CONFIRM',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  await adminAgent.post(`/api/admin/orders/${order.id}/confirm-eft`).expect(200);
  const dispatched = await sellerAgent
    .post(`/api/seller/orders/${order.id}/dispatch`)
    .send({ trackingNumber: 'TRACK-2' })
    .expect(200);

  assert.equal(dispatched.body.order.payment.status, 'confirmed');
  assert.equal(dispatched.body.order.fulfilment.status, 'dispatched');
  assert.equal(dispatched.body.order.fulfilment.trackingNumber, 'TRACK-2');
});

test('an accepted COD order may dispatch while payment is due on delivery', async () => {
  const { order, sellerAgent } = await scenario({
    payment: { method: 'cod', status: 'due_on_delivery' },
  });

  const response = await sellerAgent
    .post(`/api/seller/orders/${order.id}/dispatch`)
    .send({ trackingNumber: 'TRACK-COD' })
    .expect(200);
  assert.equal(response.body.order.fulfilment.status, 'dispatched');
  assert.equal(response.body.order.payment.status, 'due_on_delivery');
});

test('confirming receipt is idempotent and never marks COD as paid', async () => {
  const { order, buyerAgent } = await scenario({
    payment: { method: 'cod', status: 'due_on_delivery' },
    fulfilment: 'dispatched',
  });

  await buyerAgent.post(`/api/orders/${order.id}/confirm-receipt`).expect(200);
  await buyerAgent.post(`/api/orders/${order.id}/confirm-receipt`).expect(200);

  const reloaded = await Order.findById(order.id);
  assert.equal(reloaded.fulfilment.status, 'delivered');
  assert.equal(reloaded.payment.status, 'due_on_delivery');
  const receiptEvents = reloaded.events.filter((event) => event.type === 'receipt_confirmed');
  assert.equal(receiptEvents.length, 1);
});

test('COD cash collection is recorded separately after delivery', async () => {
  const { order, sellerAgent, buyerAgent } = await scenario({
    payment: { method: 'cod', status: 'due_on_delivery' },
    fulfilment: 'dispatched',
  });

  const early = await sellerAgent
    .post(`/api/seller/orders/${order.id}/collect-cod`)
    .expect(400);
  assert.equal(early.body.error.code, 'NOT_COLLECTABLE');

  await buyerAgent.post(`/api/orders/${order.id}/confirm-receipt`).expect(200);
  const collected = await sellerAgent
    .post(`/api/seller/orders/${order.id}/collect-cod`)
    .expect(200);
  assert.equal(collected.body.order.payment.status, 'paid');
  assert.ok(collected.body.order.payment.collectedAt);
});

test('an overdue COD dispatch is surfaced to the administrator', async () => {
  const { order, adminAgent } = await scenario({
    payment: { method: 'cod', status: 'due_on_delivery' },
    createdAt: daysAgo(6),
  });

  const response = await adminAgent.get('/api/admin/orders?overdue=true').expect(200);
  assert.equal(response.body.orders.some((entry) => entry.id === order.id), true);
  assert.match(response.body.orders[0].overdueReason, /without dispatch/i);
});

test('expired EFT reservations release stock exactly once', async () => {
  const { order, product } = await scenario({
    payment: {
      method: 'eft',
      status: 'awaiting_eft',
      reference: 'EFT-EXPIRED',
      expiresAt: daysAgo(1),
    },
  });
  await Product.updateOne({ _id: product._id }, { $set: { stock: 3 } });

  const released = await releaseExpiredEftOrders();
  assert.equal(released, 1);

  const reloaded = await Order.findById(order.id);
  assert.equal(reloaded.payment.status, 'expired');
  const updatedProduct = await Product.findById(product._id);
  assert.equal(updatedProduct.stock, 4);

  const secondSweep = await releaseExpiredEftOrders();
  assert.equal(secondSweep, 0);
  const afterSecond = await Product.findById(product._id);
  assert.equal(afterSecond.stock, 4, 'stock must not be released twice');
});