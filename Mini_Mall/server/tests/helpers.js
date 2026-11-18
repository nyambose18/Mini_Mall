import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import '../src/db.js';
import { createApp } from '../src/app.js';
import { User } from '../src/models/User.js';
import { Category } from '../src/models/Category.js';
import { Product } from '../src/models/Product.js';
import { Order } from '../src/models/Order.js';
import { Refund } from '../src/models/Refund.js';
import { Counter } from '../src/models/Counter.js';
import { slugify } from '../src/utils/text.js';

export const app = createApp();
export const PASSWORD = 'Test123!';

let mongod;
let sequence = 0;
const nextId = () => {
  sequence += 1;
  return sequence;
};

export async function startTestDb() {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri('mini_mall_test'));
}

export async function stopTestDb() {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
}

export async function resetDb() {
  await Promise.all([
    User.deleteMany({}),
    Category.deleteMany({}),
    Product.deleteMany({}),
    Order.deleteMany({}),
    Refund.deleteMany({}),
    Counter.deleteMany({}),
  ]);
}

export async function createUser({
  role = 'buyer',
  name = `${role} ${nextId()}`,
  email = `${role}-${nextId()}@example.test`,
  postcode = '2001',
} = {}) {
  return User.create({
    name,
    email,
    passwordHash: await bcrypt.hash(PASSWORD, 4),
    role,
    phone: '070 000 0000',
    address: '1 Test Street, Johannesburg',
    postcode,
    cart: [],
  });
}

export async function createCategory(name = `Category ${nextId()}`) {
  return Category.create({ name, slug: slugify(`${name}-${nextId()}`), active: true });
}

export async function createProduct({
  seller,
  category,
  status = 'approved',
  stock = 5,
  priceCents = 10000,
  ...overrides
} = {}) {
  return Product.create({
    sellerId: seller._id,
    categoryId: category._id,
    title: `Test Sensor ${nextId()}`,
    model: 'TEST-1',
    voltage: '5 V logic',
    connector: '4-pin Dupont',
    compatibility: 'Arduino and ESP32',
    contents: '1x test sensor',
    description: 'A test listing.',
    priceCents,
    stock,
    images: ['/images/sensor.svg'],
    status,
    ...overrides,
  });
}

export function loginAgent(email, password = PASSWORD) {
  const agent = request.agent(app);
  return agent
    .post('/api/auth/login')
    .send({ email, password })
    .expect(200)
    .then(() => agent);
}

export async function addToCart(agent, productId, qty = 1) {
  return agent.post('/api/cart').send({ productId, qty }).expect(201);
}

export const daysAgo = (count) => new Date(Date.now() - count * 24 * 60 * 60 * 1000);

export async function createOrder({
  buyer,
  seller,
  product,
  qty = 1,
  payment = { method: 'cod', status: 'due_on_delivery' },
  fulfilment = 'delivered',
  createdAt = daysAgo(3),
  dispatchedAt = daysAgo(2),
  deliveredAt = daysAgo(1),
  trackingNumber = 'TEST-TRACK-1',
  refundedCents = 0,
} = {}) {
  const subtotal = product.priceCents * qty;
  const feeCents = 5000;
  const order = await Order.create({
    orderNumber: `TEST-${nextId()}`,
    buyerId: buyer._id,
    sellerId: seller._id,
    items: [
      {
        productId: product._id,
        title: product.title,
        model: product.model,
        qty,
        unitPriceCents: product.priceCents,
        lineTotalCents: subtotal,
      },
    ],
    delivery: {
      address: buyer.address,
      postcode: buyer.postcode,
      feeCents,
      workingDays: 2,
      estimatedDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    },
    subtotalCents: subtotal,
    totalCents: subtotal + feeCents,
    payment,
    fulfilment: {
      status: fulfilment,
      trackingNumber: fulfilment === 'pending' ? '' : trackingNumber,
      dispatchedAt: fulfilment === 'pending' ? null : dispatchedAt,
      deliveredAt: fulfilment === 'delivered' ? deliveredAt : null,
    },
    refundedCents,
    events: [],
  });
  await Order.collection.updateOne(
    { _id: order._id },
    { $set: { createdAt, updatedAt: createdAt } },
  );
  return order;
}