import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { User } from '../src/models/User.js';
import { signToken } from '../src/middleware/auth.js';
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

test('password-free demo sign-in is disabled by default, including administrator access', async () => {
  await createUser({ role: 'admin', email: 'priya@minimall.test' });
  const response = await request(app).post('/api/auth/demo').send({ role: 'admin' }).expect(404);
  assert.equal(response.body.error.code, 'DEMO_LOGIN_DISABLED');
});

test('bad credentials are refused', async () => {
  const buyer = await createUser({ role: 'buyer' });
  const response = await request(app)
    .post('/api/auth/login')
    .send({ email: buyer.email, password: 'wrong' })
    .expect(401);
  assert.equal(response.body.error.code, 'INVALID_CREDENTIALS');
});

const registration = {
  name: 'New Customer', email: 'customer@example.test', password: 'MyStrongPassword123!', role: 'buyer',
};

test('buyers register, retain a session and can sign in later with a hashed password', async () => {
  const agent = request.agent(app);
  const response = await agent.post('/api/auth/register').send({ ...registration, email: ' CUSTOMER@example.test ' }).expect(201);
  assert.equal(response.body.requiresApproval, false);
  assert.equal(response.body.user.email, 'customer@example.test');
  assert.equal(response.body.user.passwordHash, undefined);
  assert.equal(response.body.user.password, undefined);
  const stored = await User.findOne({ email: 'customer@example.test' }).select('+passwordHash');
  assert.notEqual(stored.passwordHash, registration.password);
  assert.ok(await bcrypt.compare(registration.password, stored.passwordHash));
  assert.equal((await User.findById(stored.id)).passwordHash, undefined);
  assert.equal((await agent.get('/api/auth/me').expect(200)).body.user.id, stored.id);
  await agent.get('/api/cart').expect(200);
  await agent.post('/api/auth/logout').expect(200);
  await loginAgent('customer@example.test', registration.password);
});

test('registration rejects duplicate emails, administrator roles and approval injection', async () => {
  await request(app).post('/api/auth/register').send(registration).expect(201);
  await request(app).post('/api/auth/register').send({ ...registration, email: 'CUSTOMER@EXAMPLE.TEST' }).expect(409);
  await request(app).post('/api/auth/register').send({ ...registration, role: 'admin' }).expect(400);
  await request(app).post('/api/auth/register').send({ ...registration, role: 'seller', sellerStatus: 'approved' }).expect(400);
  assert.equal(await User.countDocuments(), 1);
});

test('registration validates password length, UTF-8 byte limits and seller contact details', async () => {
  for (const password of ['short', 'a'.repeat(73), '\u{1F512}'.repeat(20)]) {
    const response = await request(app).post('/api/auth/register').send({ ...registration, password }).expect(400);
    assert.ok(response.body.error.fields.password);
  }
  const response = await request(app).post('/api/auth/register').send({ ...registration, role: 'seller' }).expect(400);
  assert.ok(response.body.error.fields.phone);
  assert.equal(await User.countDocuments(), 0);
});

test('a seller cannot sign in or use a token until an administrator approves the application', async () => {
  const applicant = request.agent(app);
  const input = { ...registration, role: 'seller', phone: '071 123 4567', companyName: 'Example Parts' };
  const registered = await applicant.post('/api/auth/register').send(input).expect(201);
  assert.equal(registered.body.requiresApproval, true);
  assert.equal(registered.body.user.sellerStatus, 'pending');
  assert.equal((await applicant.get('/api/auth/me').expect(200)).body.user, null);
  const refused = await applicant.post('/api/auth/login').send(input).expect(403);
  assert.equal(refused.body.error.code, 'SELLER_PENDING');
  await applicant.get('/api/seller/products').expect(401);

  const pending = await User.findById(registered.body.user.id);
  const cookie = `mm_token=${signToken(pending)}`;
  await request(app).get('/api/seller/products').set('Cookie', cookie).expect(403);
  await request(app).post('/api/seller/products').set('Cookie', cookie).send({ title: 'Unapproved listing' }).expect(403);
  assert.equal((await request(app).get('/api/auth/me').set('Cookie', cookie).expect(200)).body.user, null);

  const admin = await createUser({ role: 'admin' });
  const adminAgent = await loginAgent(admin.email);
  const queue = await adminAgent.get('/api/admin/seller-applications').expect(200);
  assert.equal(queue.body.sellers[0].id, pending.id);
  assert.equal(queue.body.sellers[0].companyName, 'Example Parts');
  assert.equal(queue.body.sellers[0].passwordHash, undefined);
  await adminAgent.post(`/api/admin/seller-applications/${pending.id}/decision`).send({ decision: 'approve' }).expect(200);
  const approved = await User.findById(pending.id);
  assert.equal(approved.sellerStatus, 'approved');
  assert.equal(approved.sellerReviewedBy.toString(), admin.id);
  assert.ok(approved.sellerReviewedAt);
  const sellerAgent = await loginAgent(input.email, input.password);
  await sellerAgent.get('/api/seller/products').expect(200);
  await sellerAgent.get('/api/admin/seller-applications').expect(403);

  await User.updateOne({ _id: pending._id }, { $set: { sellerStatus: 'pending' } });
  await sellerAgent.get('/api/seller/products').expect(403);
});

test('only administrators decide applications and rejected sellers remain blocked', async () => {
  const input = { ...registration, role: 'seller', phone: '071 123 4567' };
  const { body } = await request(app).post('/api/auth/register').send(input).expect(201);
  const url = `/api/admin/seller-applications/${body.user.id}/decision`;
  await request(app).post(url).send({ decision: 'approve' }).expect(401);
  const buyer = await createUser();
  const buyerAgent = await loginAgent(buyer.email);
  await buyerAgent.get('/api/admin/seller-applications').expect(403);
  await buyerAgent.post(url).send({ decision: 'approve' }).expect(403);
  const admin = await createUser({ role: 'admin' });
  const agent = await loginAgent(admin.email);
  await agent.post(url).send({ decision: 'reject' }).expect(400);
  await agent.post(url).send({ decision: 'reject', reason: 'Please provide a valid contact number.' }).expect(200);
  const refused = await request(app).post('/api/auth/login').send(input).expect(403);
  assert.equal(refused.body.error.code, 'SELLER_REJECTED');
  await agent.post(url).send({ decision: 'approve' }).expect(409);
  const queue = await agent.get('/api/admin/seller-applications?status=rejected').expect(200);
  assert.equal(queue.body.sellers.length, 1);
  assert.equal(queue.body.sellers[0].passwordHash, undefined);
  await agent.post(`/api/admin/seller-applications/${buyer.id}/decision`).send({ decision: 'approve' }).expect(404);
});

test('concurrent application decisions cannot overwrite the first administrator decision', async () => {
  const { body } = await request(app).post('/api/auth/register').send({ ...registration, role: 'seller', phone: '0711234567' }).expect(201);
  const admin = await createUser({ role: 'admin' });
  const agent = await loginAgent(admin.email);
  const url = `/api/admin/seller-applications/${body.user.id}/decision`;
  const responses = await Promise.all([
    agent.post(url).send({ decision: 'approve' }),
    agent.post(url).send({ decision: 'reject', reason: 'Application requires verification.' }),
  ]);
  assert.deepEqual(responses.map((response) => response.status).sort(), [200, 409]);
});
