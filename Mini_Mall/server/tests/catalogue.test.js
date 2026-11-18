import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
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

before(startTestDb);
after(stopTestDb);
beforeEach(resetDb);

test('a listing with a missing specification cannot be submitted', async () => {
  const seller = await createUser({ role: 'seller' });
  const category = await createCategory();
  const product = await createProduct({
    seller,
    category,
    status: 'draft',
    voltage: '',
  });
  const agent = await loginAgent(seller.email);

  const response = await agent.post(`/api/seller/products/${product.id}/submit`).expect(400);
  assert.equal(response.body.error.code, 'LISTING_INCOMPLETE');
  assert.match(response.body.error.fields.voltage, /required/i);
});

test('a pending listing is not public until the administrator approves it', async () => {
  const seller = await createUser({ role: 'seller' });
  const admin = await createUser({ role: 'admin' });
  const category = await createCategory();
  const product = await createProduct({ seller, category, status: 'pending' });

  const beforeList = await request(app).get('/api/products').expect(200);
  assert.equal(beforeList.body.products.some((entry) => entry.id === product.id), false);

  const adminAgent = await loginAgent(admin.email);
  await adminAgent.post(`/api/admin/products/${product.id}/approve`).expect(200);

  const afterList = await request(app).get('/api/products').expect(200);
  assert.equal(afterList.body.products.some((entry) => entry.id === product.id), true);
});

test('requesting changes records feedback the seller can read', async () => {
  const seller = await createUser({ role: 'seller' });
  const admin = await createUser({ role: 'admin' });
  const category = await createCategory();
  const product = await createProduct({ seller, category, status: 'pending' });
  const adminAgent = await loginAgent(admin.email);

  await adminAgent
    .post(`/api/admin/products/${product.id}/request-changes`)
    .send({ feedback: 'Add the exact connector type.' })
    .expect(200);

  const sellerAgent = await loginAgent(seller.email);
  const response = await sellerAgent.get(`/api/seller/products/${product.id}`).expect(200);
  assert.equal(response.body.product.status, 'changes_requested');
  assert.equal(response.body.product.reviewFeedback, 'Add the exact connector type.');
});

test('a delisting request removes an approved listing only after admin approval', async () => {
  const seller = await createUser({ role: 'seller' });
  const admin = await createUser({ role: 'admin' });
  const category = await createCategory();
  const product = await createProduct({ seller, category, status: 'approved' });
  const sellerAgent = await loginAgent(seller.email);

  const requested = await sellerAgent
    .post(`/api/seller/products/${product.id}/delist-request`)
    .expect(200);
  assert.equal(requested.body.product.status, 'delisting_requested');
  await request(app).get(`/api/products/${product.id}`).expect(200);

  const adminAgent = await loginAgent(admin.email);
  await adminAgent.post(`/api/admin/products/${product.id}/delist`).expect(200);
  await request(app).get(`/api/products/${product.id}`).expect(404);
});

test('negative stock is rejected and zero stock blocks purchase', async () => {
  const seller = await createUser({ role: 'seller' });
  const buyer = await createUser({ role: 'buyer' });
  const category = await createCategory();
  const product = await createProduct({ seller, category, stock: 4 });
  const sellerAgent = await loginAgent(seller.email);

  const negative = await sellerAgent
    .patch(`/api/seller/products/${product.id}/stock`)
    .send({ stock: -1 })
    .expect(400);
  assert.equal(negative.body.error.code, 'VALIDATION');

  await sellerAgent
    .patch(`/api/seller/products/${product.id}/stock`)
    .send({ stock: 0 })
    .expect(200);

  const buyerAgent = await loginAgent(buyer.email);
  const blocked = await buyerAgent
    .post('/api/cart')
    .send({ productId: product.id, qty: 1 })
    .expect(409);
  assert.equal(blocked.body.error.code, 'OUT_OF_STOCK');
});

test('approved products are searchable by model and filterable by category', async () => {
  const seller = await createUser({ role: 'seller' });
  const category = await createCategory('Motor drivers');
  const other = await createCategory('Sensors');
  const driver = await createProduct({
    seller,
    category,
    title: 'L298N Motor Driver',
    model: 'L298N',
  });
  await createProduct({ seller, category: other, title: 'Ultrasonic Sensor', model: 'HC-SR04' });

  const search = await request(app).get('/api/products?search=L298N').expect(200);
  assert.equal(search.body.products.length, 1);
  assert.equal(search.body.products[0].id, driver.id);

  const filtered = await request(app)
    .get(`/api/products?category=${category.id}`)
    .expect(200);
  assert.equal(
    filtered.body.products.every(
      (entry) => (entry.categoryId.id || entry.categoryId._id) === category.id,
    ),
    true,
  );
});