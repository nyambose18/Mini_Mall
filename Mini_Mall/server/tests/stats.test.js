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

before(startTestDb);
after(stopTestDb);
beforeEach(resetDb);

function isoDay(date) {
  return date.toISOString().slice(0, 10);
}

async function scenario() {
  const buyer = await createUser({ role: 'buyer' });
  const sellerA = await createUser({ role: 'seller', name: 'Lerato Mokoena' });
  const sellerB = await createUser({ role: 'seller', name: 'Sipho Ndlovu' });
  const admin = await createUser({ role: 'admin' });
  const category = await createCategory();

  const productA1 = await createProduct({ seller: sellerA, category, priceCents: 45000 });
  const productA2 = await createProduct({ seller: sellerA, category, priceCents: 25000 });
  const productA3 = await createProduct({ seller: sellerA, category, priceCents: 15000 });
  const productA4 = await createProduct({ seller: sellerA, category, priceCents: 15000 });
  const productB1 = await createProduct({ seller: sellerB, category, priceCents: 25000 });
  const productOld = await createProduct({ seller: sellerA, category, priceCents: 20000 });

  await createOrder({
    buyer,
    seller: sellerA,
    product: productA1,
    payment: { method: 'eft', status: 'confirmed', reference: 'EFT-A1' },
    createdAt: daysAgo(3),
  });
  await createOrder({
    buyer,
    seller: sellerA,
    product: productA2,
    payment: {
      method: 'eft',
      status: 'awaiting_eft',
      reference: 'EFT-A2',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
    createdAt: daysAgo(2),
  });
  await createOrder({
    buyer,
    seller: sellerA,
    product: productA3,
    payment: { method: 'cod', status: 'paid', collectedAt: daysAgo(1) },
    createdAt: daysAgo(2),
  });
  await createOrder({
    buyer,
    seller: sellerA,
    product: productA4,
    payment: { method: 'eft', status: 'confirmed', reference: 'EFT-A4' },
    createdAt: daysAgo(1),
    refundedCents: 10000,
  });
  await createOrder({
    buyer,
    seller: sellerB,
    product: productB1,
    payment: { method: 'eft', status: 'confirmed', reference: 'EFT-B1' },
    createdAt: daysAgo(1),
  });
  await createOrder({
    buyer,
    seller: sellerA,
    product: productOld,
    payment: { method: 'eft', status: 'confirmed', reference: 'EFT-OLD' },
    createdAt: daysAgo(40),
  });

  const adminAgent = await loginAgent(admin.email);
  const from = isoDay(daysAgo(7));
  const to = isoDay(new Date());
  return { adminAgent, from, to, sellerA, sellerB };
}

test('paid, pending and refunded totals stay separate', async () => {
  const { adminAgent, from, to } = await scenario();

  const response = await adminAgent
    .get(`/api/admin/stats?from=${from}&to=${to}`)
    .expect(200);
  const summary = response.body.summary;

  assert.equal(summary.paid.amountCents, 120000);
  assert.equal(summary.paid.count, 4);
  assert.equal(summary.pending.amountCents, 30000);
  assert.equal(summary.pending.count, 1);
  assert.equal(summary.refunds.amountCents, 10000);
  assert.equal(summary.refunds.count, 1);
  assert.equal(summary.orders, 5, 'the 40-day-old order should be outside the range');
});

test('the seller filter scopes every total', async () => {
  const { adminAgent, from, to, sellerA } = await scenario();

  const response = await adminAgent
    .get(`/api/admin/stats?from=${from}&to=${to}&sellerId=${sellerA.id}`)
    .expect(200);
  const summary = response.body.summary;

  assert.equal(summary.orders, 4);
  assert.equal(summary.paid.amountCents, 90000);
  assert.equal(summary.paid.count, 3);
  assert.equal(summary.pending.amountCents, 30000);
  assert.equal(summary.refunds.amountCents, 10000);
  assert.equal(summary.perSeller.length, 1);
  assert.equal(summary.perSeller[0].sellerName, 'Lerato Mokoena');
});

test('the per-seller breakdown supports the admin seller filter', async () => {
  const { adminAgent, from, to } = await scenario();

  const response = await adminAgent
    .get(`/api/admin/stats?from=${from}&to=${to}`)
    .expect(200);
  const rows = response.body.summary.perSeller;
  assert.equal(rows.length, 2);
  const lerato = rows.find((row) => row.sellerName === 'Lerato Mokoena');
  const sipho = rows.find((row) => row.sellerName === 'Sipho Ndlovu');
  assert.equal(lerato.paid.amountCents, 90000);
  assert.equal(sipho.paid.amountCents, 30000);
});

test('a seller cannot read the sales statistics', async () => {
  const seller = await createUser({ role: 'seller' });
  const agent = await loginAgent(seller.email);
  await agent.get('/api/admin/stats').expect(403);
});

test('an invalid seller filter is rejected', async () => {
  const { adminAgent } = await scenario();
  const response = await adminAgent.get('/api/admin/stats?sellerId=not-an-id').expect(400);
  assert.equal(response.body.error.code, 'INVALID_SELLER');
});