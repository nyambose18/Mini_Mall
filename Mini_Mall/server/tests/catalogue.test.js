import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import request from 'supertest';
import { addMarketplaceItems } from '../src/seed/marketplace.js';
import { seedDatabase } from '../src/seed/seed.js';
import { replaceSeedIllustrations } from '../src/seed/photos.js';
import { Product } from '../src/models/Product.js';
import { Category } from '../src/models/Category.js';
import { Order } from '../src/models/Order.js';
import {
  addToCart,
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

test('new demos expose populated categories, local images and purchasable networking items', async () => {
  await seedDatabase();
  for (const product of await Product.find()) {
    assert.match(product.images[0], /^\/images\/photos\/.+\.(jpg|png|webp)$/);
    await access(new URL(`../../client/public${product.images[0]}`, import.meta.url));
  }
  const home = await request(app).get('/api/home').expect(200);
  const categories = home.body.categories.filter((category) => /^(IT|Mechatronics) - /.test(category.name));
  assert.equal(categories.length, 6);

  for (const category of categories) {
    const filtered = await request(app).get(`/api/products?category=${category.slug}`).expect(200);
    assert.equal(filtered.body.products.length, 2);
    for (const product of filtered.body.products) {
      assert.equal(product.categoryId.id, category.id);
      assert.equal(product.status, 'approved');
      assert.ok(product.stock > 0);
      for (const field of ['voltage', 'connector', 'compatibility', 'contents']) {
        assert.ok(product[field], `${product.model} needs ${field}`);
      }
      await access(new URL(`../../client/public${product.images[0]}`, import.meta.url));
      await request(app).get(`/api/products/${product.id}`).expect(200);
    }
  }

  const search = await request(app).get('/api/products?search=MM-WR300').expect(200);
  assert.equal(search.body.products.length, 1);
  const buyer = await loginAgent('thabo@minimall.test', 'Buyer123!');
  await addToCart(buyer, search.body.products[0].id);
});

test('catalogue updates preserve existing records and never reset stock or moderation on rerun', async () => {
  const seller = await createUser({ role: 'seller', email: 'lerato@minimall.test' });
  const buyer = await createUser();
  const category = await createCategory();
  const original = await createProduct({ seller, category, stock: 17 });
  const order = await createOrder({ buyer, seller, product: original });
  const originalBefore = await Product.findById(original.id).lean();
  const orderBefore = await Order.findById(order.id).lean();

  const first = await addMarketplaceItems();
  assert.equal(first.productsAdded, 12);
  const router = await Product.findOne({ model: 'MM-WR300' });
  await Product.updateOne({ _id: router._id }, { $set: { stock: 2, priceCents: 12345, status: 'delisted' } });
  await Category.updateOne({ _id: router.categoryId }, { $set: { active: false } });
  const routerBefore = await Product.findById(router._id).lean();
  const categoryBefore = await Category.findById(router.categoryId).lean();

  const second = await seedDatabase();
  assert.equal(second.skipped, true);
  assert.equal(second.marketplace.productsAdded, 0);
  assert.equal(await Product.countDocuments(), 13);
  assert.equal(await Category.countDocuments(), 7);
  assert.deepEqual(await Product.findById(original.id).lean(), originalBefore);
  assert.deepEqual(await Order.findById(order.id).lean(), orderBefore);
  assert.deepEqual(await Product.findById(router._id).lean(), routerBefore);
  assert.deepEqual(await Category.findById(router.categoryId).lean(), categoryBefore);
});

test('photo replacement preserves uploads, stock, prices, moderation and unrelated sellers', async () => {
  const seller = await createUser({ role: 'seller', email: 'lerato@minimall.test' });
  const otherSeller = await createUser({ role: 'seller' });
  const category = await createCategory();
  const legacy = await createProduct({
    seller, category, model: 'L298N', status: 'delisted', stock: 2, priceCents: 12345,
    images: ['/images/motor-driver.svg', '/uploads/seller-photo.jpg'],
  });
  const uploaded = await createProduct({
    seller, category, model: 'SG90', images: ['/uploads/custom-servo.jpg'],
  });
  const unrelated = await createProduct({
    seller: otherSeller, category, model: 'L298N', images: ['/images/motor-driver.svg'],
  });
  const before = await Product.findById(legacy.id).lean();
  const uploadedBefore = await Product.findById(uploaded.id).lean();
  const unrelatedBefore = await Product.findById(unrelated.id).lean();

  assert.equal(await replaceSeedIllustrations(), 1);
  assert.deepEqual(await Product.findById(legacy.id).lean(), {
    ...before, images: ['/images/photos/l298n.png', '/uploads/seller-photo.jpg'],
  });
  assert.deepEqual(await Product.findById(uploaded.id).lean(), uploadedBefore);
  assert.deepEqual(await Product.findById(unrelated.id).lean(), unrelatedBefore);
  assert.equal(await replaceSeedIllustrations(), 0);
});
