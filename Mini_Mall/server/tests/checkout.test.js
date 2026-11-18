import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addToCart,
  app,
  createCategory,
  createProduct,
  createUser,
  loginAgent,
  resetDb,
  startTestDb,
  stopTestDb,
} from './helpers.js';
import { Order } from '../src/models/Order.js';
import { Product } from '../src/models/Product.js';

before(startTestDb);
after(stopTestDb);
beforeEach(resetDb);

const CHECKOUT = {
  address: '12 Juta Street, Braamfontein',
  postcode: '2001',
  paymentMethod: 'eft',
};

async function scenario({ stock = 5, priceCents = 10000 } = {}) {
  const buyer = await createUser({ role: 'buyer', postcode: '2001' });
  const seller = await createUser({ role: 'seller' });
  const category = await createCategory();
  const product = await createProduct({ seller, category, stock, priceCents });
  const agent = await loginAgent(buyer.email);
  return { buyer, seller, category, product, agent };
}

test('two simultaneous checkouts for the last unit create at most one order', async () => {
  const { product, agent } = await scenario({ stock: 1 });
  await addToCart(agent, product.id, 1);

  const results = await Promise.all([
    agent.post('/api/orders').send(CHECKOUT),
    agent.post('/api/orders').send(CHECKOUT),
  ]);
  const successes = results.filter((response) => response.status === 201);
  assert.equal(successes.length, 1, 'exactly one checkout should succeed');

  const orders = await Order.find({});
  assert.equal(orders.length, 1);
  const remaining = await Product.findById(product.id);
  assert.equal(remaining.stock, 0);
});

test('a cart spanning two sellers is blocked at checkout', async () => {
  const buyer = await createUser({ role: 'buyer' });
  const sellerA = await createUser({ role: 'seller' });
  const sellerB = await createUser({ role: 'seller' });
  const category = await createCategory();
  const first = await createProduct({ seller: sellerA, category });
  const second = await createProduct({ seller: sellerB, category });
  const agent = await loginAgent(buyer.email);
  await addToCart(agent, first.id);
  await addToCart(agent, second.id);

  const response = await agent.post('/api/orders').send(CHECKOUT).expect(400);
  assert.equal(response.body.error.code, 'MIXED_SELLERS');
  assert.equal(await Order.countDocuments({}), 0);
});

test('ineligible COD is refused while EFT remains available', async () => {
  const { agent, product } = await scenario();
  await addToCart(agent, product.id);

  const blocked = await agent
    .post('/api/orders')
    .send({ ...CHECKOUT, postcode: '9000', paymentMethod: 'cod' })
    .expect(400);
  assert.equal(blocked.body.error.code, 'COD_INELIGIBLE');
  assert.equal(blocked.body.error.eligible, false);

  const accepted = await agent
    .post('/api/orders')
    .send({ ...CHECKOUT, paymentMethod: 'eft' })
    .expect(201);
  assert.equal(accepted.body.order.payment.status, 'awaiting_eft');
});

test('checkout shows the full rand total and the working-day estimate', async () => {
  const { agent, product } = await scenario({ priceCents: 10000, stock: 5 });
  await addToCart(agent, product.id, 2);

  const response = await agent.post('/api/orders').send(CHECKOUT).expect(201);
  const order = response.body.order;
  assert.equal(order.subtotalCents, 20000);
  assert.equal(order.delivery.feeCents, 5000);
  assert.equal(order.totalCents, 25000);
  assert.equal(order.delivery.workingDays, 2);
  assert.ok(order.delivery.estimatedDate);

  const updated = await Product.findById(product.id);
  assert.equal(updated.stock, 3);
});

test('a failed EFT can be retried on the same order without duplicates', async () => {
  const { agent, product } = await scenario({ stock: 4 });
  await addToCart(agent, product.id, 1);

  const placed = await agent.post('/api/orders').send(CHECKOUT).expect(201);
  const orderId = placed.body.order.id;

  const failed = await agent
    .post(`/api/orders/${orderId}/pay`)
    .send({ result: 'fail' })
    .expect(200);
  assert.equal(failed.body.order.payment.status, 'failed');

  const retried = await agent
    .post(`/api/orders/${orderId}/pay`)
    .send({ result: 'success' })
    .expect(200);
  assert.equal(retried.body.order.payment.status, 'awaiting_confirmation');
  assert.equal(await Order.countDocuments({}), 1);

  const updated = await Product.findById(product.id);
  assert.equal(updated.stock, 3, 'stock should be reserved once, not twice');
});

test('the quote endpoint reports fees, working days and COD eligibility', async () => {
  const { agent } = await scenario();

  const eligible = await agent.get('/api/orders/quote?postcode=2001').expect(200);
  assert.equal(eligible.body.quote.feeCents, 5000);
  assert.equal(eligible.body.quote.workingDays, 2);
  assert.equal(eligible.body.quote.codEligible, true);

  const ineligible = await agent.get('/api/orders/quote?postcode=9000').expect(200);
  assert.equal(ineligible.body.quote.feeCents, 7500);
  assert.equal(ineligible.body.quote.workingDays, 5);
  assert.equal(ineligible.body.quote.codEligible, false);
});

test('checkout rechecks stock and returns the affected item', async () => {
  const { agent, product, seller } = await scenario({ stock: 3 });
  await addToCart(agent, product.id, 2);

  await Product.updateOne({ _id: product._id }, { $set: { stock: 1 } });

  const response = await agent.post('/api/orders').send(CHECKOUT).expect(409);
  assert.equal(response.body.error.code, 'CART_CHANGED');
  assert.equal(response.body.error.items[0].productId, product.id);
  assert.equal(await Order.countDocuments({}), 0);
  assert.ok(seller);
});