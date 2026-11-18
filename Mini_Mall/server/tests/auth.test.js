import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {
  app,
  createCategory,
  createOrder,
  createProduct,
  createUser,
  loginAgent,
  resetDb,
  startTestDb,
  stopTestDb,
} from './helpers.js';

before(startTestDb);
after(stopTestDb);
beforeEach(resetDb);

test('unauthenticated requests are rejected', async () => {
  await request(app).get('/api/cart').expect(401);
  await request(app).get('/api/orders').expect(401);
  await request(app).get('/api/admin/statistics').expect(401);

  const me = await request(app).get('/api/auth/me').expect(200);
  assert.equal(me.body.user, null);
});

test('a buyer receives 403 from seller and admin APIs', async () => {
  const buyer = await createUser({ role: 'buyer' });
  const agent = await loginAgent(buyer.email);

  const admin = await agent.get('/api/admin/catalogue').expect(403);
  assert.equal(admin.body.error.code, 'FORBIDDEN');
  await agent.get('/api/admin/orders').expect(403);
  await agent.get('/api/seller/products').expect(403);
});

test('a seller cannot read or edit another seller listing', async () => {
  const sellerA = await createUser({ role: 'seller' });
  const sellerB = await createUser({ role: 'seller' });
  const buyer = await createUser({ role: 'buyer' });
  const category = await createCategory();
  const product = await createProduct({ seller: sellerA, category });
  const order = await createOrder({
    buyer,
    seller: sellerA,
    product,
    payment: { method: 'cod', status: 'due_on_delivery' },
    fulfilment: 'pending',
  });
  const agentB = await loginAgent(sellerB.email);

  await agentB.get(`/api/seller/products/${product.id}`).expect(403);
  await agentB
    .patch(`/api/seller/products/${product.id}/stock`)
    .send({ stock: 2 })
    .expect(403);
  await agentB
    .post(`/api/seller/orders/${order.id}/dispatch`)
    .send({ trackingNumber: 'TRACK' })
    .expect(403);
});

test('a buyer cannot open another buyer order', async () => {
  const buyerA = await createUser({ role: 'buyer' });
  const buyerB = await createUser({ role: 'buyer' });
  const seller = await createUser({ role: 'seller' });
  const category = await createCategory();
  const product = await createProduct({ seller, category });
  const order = await createOrder({ buyer: buyerA, seller, product });
  const agentB = await loginAgent(buyerB.email);

  const response = await agentB.get(`/api/orders/${order.id}`).expect(403);
  assert.equal(response.body.error.code, 'FORBIDDEN');
});

test('demo login works for a seeded persona account', async () => {
  await createUser({ role: 'buyer', email: 'thabo@minimall.test', name: 'Thabo Dlamini' });
  const agent = request.agent(app);
  const response = await agent.post('/api/auth/demo').send({ role: 'buyer' }).expect(200);
  assert.equal(response.body.user.role, 'buyer');
  assert.equal(response.body.user.name, 'Thabo Dlamini');

  const me = await agent.get('/api/auth/me').expect(200);
  assert.equal(me.body.user.email, 'thabo@minimall.test');
});

test('bad credentials are refused', async () => {
  const buyer = await createUser({ role: 'buyer' });
  const response = await request(app)
    .post('/api/auth/login')
    .send({ email: buyer.email, password: 'wrong' })
    .expect(401);
  assert.equal(response.body.error.code, 'INVALID_CREDENTIALS');
});