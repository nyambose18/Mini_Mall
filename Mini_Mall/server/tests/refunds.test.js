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
import { Refund } from '../src/models/Refund.js';

before(startTestDb);
after(stopTestDb);
beforeEach(resetDb);

async function scenario({ fulfilment = 'delivered', deliveredAt = daysAgo(1) } = {}) {
  const buyer = await createUser({ role: 'buyer' });
  const seller = await createUser({ role: 'seller' });
  const admin = await createUser({ role: 'admin' });
  const category = await createCategory();
  const product = await createProduct({ seller, category, priceCents: 12000 });
  const order = await createOrder({
    buyer,
    seller,
    product,
    payment: { method: 'eft', status: 'confirmed', reference: 'EFT-R' },
    fulfilment,
    deliveredAt,
  });
  const buyerAgent = await loginAgent(buyer.email);
  const sellerAgent = await loginAgent(seller.email);
  const adminAgent = await loginAgent(admin.email);
  return { buyer, seller, admin, category, product, order, buyerAgent, sellerAgent, adminAgent };
}

function requestRefund(agent, order, reason = 'The board arrived cracked and does not power on.') {
  return agent.post('/api/refunds').send({
    orderId: order.id,
    itemId: order.items[0]._id.toString(),
    reason,
  });
}

test('a delivered item can be refunded and a duplicate open case is blocked', async () => {
  const { order, buyerAgent } = await scenario();

  const created = await requestRefund(buyerAgent, order).expect(201);
  assert.equal(created.body.refund.status, 'requested');
  assert.equal(created.body.refund.amountCents, 12000);
  assert.equal(created.body.refund.orderItemId, order.items[0]._id.toString());

  const duplicate = await requestRefund(buyerAgent, order).expect(409);
  assert.equal(duplicate.body.error.code, 'REFUND_EXISTS');
});

test('an item cannot be refunded before delivery', async () => {
  const { order, buyerAgent } = await scenario({
    fulfilment: 'dispatched',
    deliveredAt: null,
  });

  const response = await requestRefund(buyerAgent, order).expect(409);
  assert.equal(response.body.error.code, 'REFUND_NOT_ELIGIBLE');
  assert.match(response.body.error.message, /delivered/i);
});

test('the 7-day refund window is enforced', async () => {
  const { order, buyerAgent } = await scenario({ deliveredAt: daysAgo(8) });

  const response = await requestRefund(buyerAgent, order).expect(409);
  assert.equal(response.body.error.code, 'REFUND_NOT_ELIGIBLE');
  assert.match(response.body.error.message, /window/i);
});

test('another buyer cannot request a refund on someone else order', async () => {
  const { order } = await scenario();
  const otherBuyer = await createUser({ role: 'buyer' });
  const otherAgent = await loginAgent(otherBuyer.email);

  await requestRefund(otherAgent, order).expect(404);
});

test('a rejected refund keeps the order delivered and records the reason', async () => {
  const { order, buyerAgent, adminAgent } = await scenario();
  const created = await requestRefund(buyerAgent, order).expect(201);

  const decided = await adminAgent
    .post(`/api/admin/refunds/${created.body.refund.id}/decide`)
    .send({ decision: 'reject', reason: 'The damage was not visible in the supplied evidence.' })
    .expect(200);
  assert.equal(decided.body.refund.status, 'rejected');
  assert.match(decided.body.refund.decisionReason, /not visible/i);

  const reloaded = await Order.findById(order.id);
  assert.equal(reloaded.fulfilment.status, 'delivered');

  const buyerView = await buyerAgent.get(`/api/refunds/${created.body.refund.id}`).expect(200);
  assert.equal(buyerView.body.refund.status, 'rejected');
  assert.match(buyerView.body.refund.decisionReason, /not visible/i);
});

test('approve, return receipt and completion are separate steps', async () => {
  const { order, buyerAgent, sellerAgent, adminAgent } = await scenario();
  const created = await requestRefund(buyerAgent, order).expect(201);
  const refundId = created.body.refund.id;

  const approved = await adminAgent
    .post(`/api/admin/refunds/${refundId}/decide`)
    .send({ decision: 'approve', reason: 'Approved after reviewing the evidence.' })
    .expect(200);
  assert.equal(approved.body.refund.status, 'awaiting_return');

  const tooEarly = await adminAgent.post(`/api/admin/refunds/${refundId}/complete`).expect(409);
  assert.equal(tooEarly.body.error.code, 'RETURN_NOT_RECORDED');

  const received = await sellerAgent
    .post(`/api/seller/refunds/${refundId}/return-received`)
    .send({ note: 'Returned board received and inspected.' })
    .expect(200);
  assert.equal(received.body.refund.status, 'return_received');

  const completed = await adminAgent.post(`/api/admin/refunds/${refundId}/complete`).expect(200);
  assert.equal(completed.body.refund.status, 'refunded');

  const reloaded = await Order.findById(order.id);
  assert.equal(reloaded.refundedCents, 12000);
  const refund = await Refund.findById(refundId);
  assert.ok(refund.completedAt);
});

test('a refund case is visible only to its buyer, seller and the administrator', async () => {
  const { order, buyerAgent } = await scenario();
  const created = await requestRefund(buyerAgent, order).expect(201);
  const otherBuyer = await createUser({ role: 'buyer' });
  const otherAgent = await loginAgent(otherBuyer.email);

  const response = await otherAgent.get(`/api/refunds/${created.body.refund.id}`).expect(403);
  assert.equal(response.body.error.code, 'FORBIDDEN');
});