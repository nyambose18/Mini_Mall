import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';

import { User } from '../models/User.js';
import { Category } from '../models/Category.js';
import { Product } from '../models/Product.js';
import { Order } from '../models/Order.js';
import { Refund } from '../models/Refund.js';
import { Counter } from '../models/Counter.js';
import { connectDb, disconnectDb } from '../db.js';
import { eftReference, nextOrderNumber } from '../utils/refs.js';
import { quoteFor } from '../utils/pricing.js';
import { slugify } from '../utils/text.js';
import { addMarketplaceItems } from './marketplace.js';
import { productPhoto } from './photos.js';

const DEMO_PASSWORDS = {
  seller: 'Seller123!',
  buyer: 'Buyer123!',
  admin: 'Admin123!',
};

const CATEGORY_NAMES = [
  'Boards & MCUs',
  'Motor drivers',
  'Sensors',
  'Power',
  'Cables & connectors',
  'Tools',
];

const PRODUCTS = [
  {
    seller: 'lerato',
    category: 'Boards & MCUs',
    title: 'Arduino Uno R3',
    model: 'A000066',
    price: 549,
    stock: 14,
    image: 'board.svg',
    voltage: '5 V logic, 7–12 V input',
    connector: 'USB-B and 2.54 mm headers',
    compatibility: 'Arduino Uno shields and 5 V logic projects',
    contents: '1x Arduino Uno R3 board',
    description: 'The classroom-standard board for robotics practicals. Includes the ATmega328P microcontroller and 14 digital pins.',
  },
  {
    seller: 'lerato',
    category: 'Boards & MCUs',
    title: 'ESP32 DevKit V1',
    model: 'ESP32-WROOM-32',
    price: 329,
    stock: 20,
    image: 'board.svg',
    voltage: '3.3 V logic, 5 V USB input',
    connector: 'Micro-USB and 2.54 mm headers',
    compatibility: '3.3 V sensors; use level shifting for 5 V modules',
    contents: '1x ESP32 DevKit V1 board',
    description: 'Dual-core Wi-Fi and Bluetooth board for connected robotics projects.',
  },
  {
    seller: 'lerato',
    category: 'Boards & MCUs',
    title: 'Raspberry Pi Pico W',
    model: 'Pico W',
    price: 289,
    stock: 9,
    image: 'board.svg',
    voltage: '3.3 V logic, 5 V VSYS input',
    connector: 'Micro-USB and castellated pads',
    compatibility: '3.3 V Grove and breakout sensors',
    contents: '1x Pico W board and pin diagram',
    description: 'Compact microcontroller with wireless networking and MicroPython support.',
  },
  {
    seller: 'lerato',
    category: 'Motor drivers',
    title: 'L298N Motor Driver Module',
    model: 'L298N',
    price: 149,
    stock: 18,
    image: 'motor-driver.svg',
    voltage: '5 V logic, 5–35 V motor supply',
    connector: 'Screw terminals and 2.54 mm headers',
    compatibility: 'Arduino, ESP32 and Pico control signals; two DC motors',
    contents: '1x L298N module',
    description: 'Dual H-bridge for two DC motors or one stepper. Check the motor supply before connecting.',
  },
  {
    seller: 'lerato',
    category: 'Motor drivers',
    title: 'TB6612FNG Motor Driver',
    model: 'TB6612FNG',
    price: 189,
    stock: 0,
    image: 'motor-driver.svg',
    voltage: '3.3–5 V logic, 2.5–13.5 V motor supply',
    connector: '2.54 mm headers',
    compatibility: '3.3 V and 5 V microcontrollers, two DC motors',
    contents: '1x TB6612FNG breakout',
    description: 'Efficient dual motor driver. Currently out of stock, so purchasing is blocked.',
  },
  {
    seller: 'lerato',
    category: 'Motor drivers',
    title: 'SG90 Servo Motor',
    model: 'SG90',
    price: 89,
    stock: 30,
    image: 'motor-driver.svg',
    voltage: '4.8–6 V supply, 5 V PWM signal',
    connector: '3-pin Dupont female',
    compatibility: 'Arduino Servo library and 5 V controllers',
    contents: '1x SG90 servo and 1x horn screw',
    description: 'Small 180-degree servo for grippers and pan-tilt mechanisms.',
  },
  {
    seller: 'lerato',
    category: 'Sensors',
    title: 'HC-SR04 Ultrasonic Sensor',
    model: 'HC-SR04',
    price: 69,
    stock: 25,
    image: 'sensor.svg',
    voltage: '5 V supply, 5 V trigger/echo',
    connector: '4-pin Dupont female',
    compatibility: '5 V controllers; use a divider for 3.3 V inputs',
    contents: '1x HC-SR04 sensor',
    description: 'Measures distance from 2 cm to 400 cm. The echo pin outputs 5 V, so level shifting is needed on a Pico or ESP32.',
  },
  {
    seller: 'lerato',
    category: 'Sensors',
    title: 'DHT22 Temperature and Humidity Sensor',
    model: 'AM2302',
    price: 179,
    stock: 12,
    image: 'sensor.svg',
    voltage: '3.3–6 V supply',
    connector: '3-pin Dupont female',
    compatibility: 'Arduino, ESP32 and Pico with a 10 kΩ pull-up',
    contents: '1x DHT22 sensor module',
    description: 'Digital temperature and humidity sensor with a calibrated output.',
  },
  {
    seller: 'lerato',
    category: 'Sensors',
    title: 'MPU6050 Gyroscope Module',
    model: 'MPU6050',
    price: 139,
    stock: 7,
    image: 'sensor.svg',
    voltage: '3.3–5 V supply, 3.3 V logic',
    connector: '2.54 mm headers',
    compatibility: 'I2C at address 0x68 on 3.3 V logic',
    contents: '1x MPU6050 module',
    description: 'Six-axis accelerometer and gyroscope for balancing and motion projects.',
  },
  {
    seller: 'lerato',
    category: 'Power',
    title: '9V 1A Power Adapter',
    model: '9V-1A',
    price: 219,
    stock: 11,
    image: 'power.svg',
    voltage: '9 V DC output at 1 A',
    connector: '2.1 mm centre-positive barrel',
    compatibility: 'Arduino barrel jack and 9 V motor drivers',
    contents: '1x 9 V power adapter',
    description: 'Regulated supply for boards and small motor drivers. South African 2-pin plug.',
  },
  {
    seller: 'lerato',
    category: 'Power',
    title: 'LM2596 Buck Converter',
    model: 'LM2596',
    price: 79,
    stock: 16,
    image: 'power.svg',
    voltage: '4.5–35 V input, 1.25–30 V output',
    connector: 'Screw terminals',
    compatibility: 'Adjustable supply for 5 V and 3.3 V rails',
    contents: '1x LM2596 module',
    description: 'Adjustable step-down converter. Set the output voltage before connecting a board.',
  },
  {
    seller: 'lerato',
    category: 'Cables & connectors',
    title: 'Jumper Wire Set (120 pieces)',
    model: 'JW-120',
    price: 99,
    stock: 22,
    image: 'cable.svg',
    voltage: 'Rated to 30 V',
    connector: 'Male-to-male, male-to-female and female-to-female Dupont',
    compatibility: '2.54 mm breadboard and header spacing',
    contents: '120x assorted jumper wires',
    description: 'Assorted jumper leads in three lengths for breadboard prototyping.',
  },
  {
    seller: 'lerato',
    category: 'Tools',
    title: 'Precision Screwdriver Set',
    model: 'PSD-32',
    price: 249,
    stock: 6,
    image: 'tool.svg',
    voltage: 'Not applicable',
    connector: '32 interchangeable bits',
    compatibility: 'Electronics enclosures and small fasteners',
    contents: '1x handle and 32x bits in a case',
    description: 'Magnetic precision driver set for board mounts and enclosures.',
  },
  {
    seller: 'lerato',
    category: 'Motor drivers',
    title: 'N20 Gear Motor 6V',
    model: 'N20-6V',
    price: 129,
    stock: 8,
    image: 'motor-driver.svg',
    voltage: '6 V nominal, 3–7.5 V range',
    connector: '2x 1.25 mm motor leads',
    compatibility: 'TB6612FNG or L298N at 6 V motor supply',
    contents: '1x N20 gear motor',
    description: 'Compact geared motor for small robots.',
    status: 'pending',
  },
  {
    seller: 'lerato',
    category: 'Sensors',
    title: 'Line Follower Sensor Array',
    model: 'LFS-8',
    price: 159,
    stock: 5,
    image: 'sensor.svg',
    voltage: '5 V supply',
    connector: 'Current listing does not state the connector',
    compatibility: '5 V controllers',
    contents: '1x eight-channel sensor array',
    description: 'Eight reflective sensors for line-following robots.',
    status: 'changes_requested',
    reviewFeedback:
      'Please add the correct connector type and confirm that the outputs are 5 V. The current connector note is not specific enough for a buyer.',
  },
  {
    seller: 'lerato',
    category: 'Power',
    title: 'Old 5V Relay Module',
    model: 'RELAY-5V',
    price: 59,
    stock: 3,
    image: 'power.svg',
    voltage: '5 V coil, 250 V AC contact rating',
    connector: 'Screw terminals and 3-pin header',
    compatibility: 'Arduino digital outputs; mains wiring requires supervision',
    contents: '1x relay module',
    description: 'Single-channel relay module. Delisting requested because the enclosure is damaged.',
    status: 'delisting_requested',
  },
  {
    seller: 'sipho',
    category: 'Boards & MCUs',
    title: 'NodeMCU ESP8266 Board',
    model: 'NodeMCU-ESP8266',
    price: 249,
    stock: 10,
    image: 'board.svg',
    voltage: '3.3 V logic, 5 V USB input',
    connector: 'Micro-USB and 2.54 mm headers',
    compatibility: '3.3 V sensors and Wi-Fi projects',
    contents: '1x NodeMCU board',
    description: 'Wi-Fi development board from a second seller, used to demonstrate seller filters.',
  },
  {
    seller: 'sipho',
    category: 'Sensors',
    title: 'OLED Display 0.96 inch',
    model: 'SSD1306',
    price: 119,
    stock: 14,
    image: 'sensor.svg',
    voltage: '3.3–5 V supply',
    connector: 'I2C 4-pin header',
    compatibility: 'I2C at address 0x3C',
    contents: '1x OLED display',
    description: 'Small I2C display for status readouts.',
    status: 'pending',
  },
  {
    seller: 'lerato',
    category: 'Tools',
    title: 'Breadboard 830 Tie Points',
    model: 'BB-830',
    price: 89,
    stock: 7,
    image: 'tool.svg',
    voltage: '',
    connector: '',
    compatibility: '',
    contents: '',
    description: 'Draft listing that still needs its specification fields completed.',
    status: 'draft',
  },
];

const at = (now, days = 0, hours = 0) =>
  new Date(now.getTime() - (days * 24 + hours) * 60 * 60 * 1000);

function event(type, label, when, note = '', actor = null, actorRole = 'system') {
  return {
    type,
    label,
    note,
    actorId: actor?._id || null,
    actorRole,
    at: when,
  };
}

async function createOrder({
  buyer,
  seller,
  lines,
  payment,
  fulfilment,
  createdAt,
  events,
  trackingNumber = '',
  dispatchedAt = null,
  deliveredAt = null,
  refundedCents = 0,
  productByTitle,
  priya,
}) {
  const items = lines.map(({ title, qty }) => {
    const product = productByTitle.get(title);
    if (!product) throw new Error(`Seed product missing: ${title}`);
    return {
      productId: product._id,
      title: product.title,
      model: product.model,
      qty,
      unitPriceCents: product.priceCents,
      lineTotalCents: product.priceCents * qty,
    };
  });

  const quote = quoteFor('2001', createdAt);
  const subtotalCents = items.reduce((sum, item) => sum + item.lineTotalCents, 0);
  const orderNumber = await nextOrderNumber(createdAt);
  const order = new Order({
    orderNumber,
    buyerId: buyer._id,
    sellerId: seller._id,
    items,
    delivery: {
      address: buyer.address,
      postcode: quote.postcode,
      feeCents: quote.feeCents,
      workingDays: quote.workingDays,
      estimatedDate: new Date(quote.estimatedDate),
    },
    subtotalCents,
    totalCents: subtotalCents + quote.feeCents,
    payment,
    fulfilment: {
      status: fulfilment.status,
      trackingNumber,
      dispatchedAt,
      deliveredAt,
    },
    refundedCents,
    events,
  });
  await order.save();
  await Order.collection.updateOne(
    { _id: order._id },
    { $set: { createdAt, updatedAt: createdAt } },
  );
  return order;
}

async function createRefund({
  order,
  item,
  buyer,
  seller,
  reason,
  status,
  createdAt,
  priya,
  decidedAt = null,
  completedAt = null,
  decisionReason = '',
  events,
}) {
  const refund = new Refund({
    orderId: order._id,
    orderItemId: item._id.toString(),
    productId: item.productId,
    buyerId: buyer._id,
    sellerId: seller._id,
    reason,
    imageUrl: '',
    amountCents: item.lineTotalCents,
    status,
    decisionReason,
    decidedBy: decidedAt ? priya._id : null,
    decidedAt,
    completedAt,
    events,
  });
  await refund.save();
  await Refund.collection.updateOne(
    { _id: refund._id },
    { $set: { createdAt, updatedAt: createdAt } },
  );
  return refund;
}

export async function isDatabaseEmpty() {
  return (await User.countDocuments()) === 0;
}

export async function seedDatabase({ reset = false, now = new Date() } = {}) {
  if (reset) {
    await Promise.all([
      User.deleteMany({}),
      Category.deleteMany({}),
      Product.deleteMany({}),
      Order.deleteMany({}),
      Refund.deleteMany({}),
      Counter.deleteMany({}),
    ]);
  }

  if ((await User.countDocuments()) > 0) {
    return { skipped: true, marketplace: await addMarketplaceItems({ now }) };
  }

  const [sellerHash, buyerHash, adminHash] = await Promise.all([
    bcrypt.hash(DEMO_PASSWORDS.seller, 10),
    bcrypt.hash(DEMO_PASSWORDS.buyer, 10),
    bcrypt.hash(DEMO_PASSWORDS.admin, 10),
  ]);

  const lerato = await User.create({
    name: 'Lerato Mokoena',
    email: 'lerato@minimall.test',
    passwordHash: sellerHash,
    role: 'seller',
    sellerStatus: 'approved',
    phone: '071 555 0101',
    address: '14 Main Reef Road, Germiston',
    postcode: '1401',
  });
  const thabo = await User.create({
    name: 'Thabo Dlamini',
    email: 'thabo@minimall.test',
    passwordHash: buyerHash,
    role: 'buyer',
    phone: '072 555 0144',
    address: '12 Juta Street, Braamfontein, Johannesburg',
    postcode: '2001',
  });
  const priya = await User.create({
    name: 'Priya Naidoo',
    email: 'priya@minimall.test',
    passwordHash: adminHash,
    role: 'admin',
    phone: '073 555 0188',
    address: '8 Florida Road, Durban',
    postcode: '4001',
  });
  const sipho = await User.create({
    name: 'Sipho Ndlovu',
    email: 'sipho@minimall.test',
    passwordHash: sellerHash,
    role: 'seller',
    sellerStatus: 'approved',
    phone: '074 555 0122',
    address: '22 Chris Hani Road, Soweto',
    postcode: '1801',
  });

  const categories = {};
  for (const name of CATEGORY_NAMES) {
    categories[name] = await Category.create({ name, slug: slugify(name), active: true });
  }

  const sellers = { lerato, sipho };
  const productByTitle = new Map();
  for (const row of PRODUCTS) {
    const status = row.status || 'approved';
    const product = await Product.create({
      sellerId: sellers[row.seller]._id,
      categoryId: categories[row.category]._id,
      title: row.title,
      model: row.model,
      voltage: row.voltage,
      connector: row.connector,
      compatibility: row.compatibility,
      contents: row.contents,
      description: row.description,
      priceCents: row.price * 100,
      stock: row.stock,
      images: [productPhoto(row.model, `/images/${row.image}`)],
      status,
      reviewFeedback: row.reviewFeedback || '',
      submittedAt: ['pending', 'changes_requested', 'delisting_requested'].includes(status)
        ? at(now, 3)
        : null,
      approvedAt: ['approved', 'delisting_requested'].includes(status) ? at(now, 2) : null,
      delistedAt: null,
    });
    productByTitle.set(row.title, product);
  }

  const orderDefinitions = [
    {
      buyer: thabo,
      seller: lerato,
      lines: [{ title: 'L298N Motor Driver Module', qty: 1 }],
      payment: {
        method: 'eft',
        status: 'awaiting_eft',
        reference: eftReference(),
        expiresAt: new Date(at(now, 0, 2).getTime() + 24 * 60 * 60 * 1000),
      },
      fulfilment: { status: 'pending' },
      createdAt: at(now, 0, 2),
      events: [
        event('order_placed', 'Order placed', at(now, 0, 2), 'Payment is awaited by EFT. Stock is reserved for 24 hours.', thabo, 'buyer'),
      ],
    },
    {
      buyer: thabo,
      seller: lerato,
      lines: [
        { title: 'Arduino Uno R3', qty: 1 },
        { title: 'Jumper Wire Set (120 pieces)', qty: 1 },
      ],
      payment: {
        method: 'eft',
        status: 'confirmed',
        reference: eftReference(),
        attempts: 1,
        submittedAt: at(now, 1, 6),
        confirmedAt: at(now, 1, 2),
        confirmedBy: priya._id,
      },
      fulfilment: { status: 'pending' },
      createdAt: at(now, 1, 8),
      events: [
        event('order_placed', 'Order placed', at(now, 1, 8), 'Payment is awaited by EFT.', thabo, 'buyer'),
        event('payment_submitted', 'Simulated EFT payment submitted', at(now, 1, 6), '', thabo, 'buyer'),
        event('eft_confirmed', 'Simulated EFT confirmed', at(now, 1, 2), 'Dispatch is now permitted.', priya, 'admin'),
      ],
    },
    {
      buyer: thabo,
      seller: lerato,
      lines: [{ title: 'ESP32 DevKit V1', qty: 1 }],
      payment: {
        method: 'eft',
        status: 'awaiting_confirmation',
        reference: eftReference(),
        attempts: 1,
        submittedAt: at(now, 0, 4),
        expiresAt: new Date(at(now, 0, 5).getTime() + 24 * 60 * 60 * 1000),
      },
      fulfilment: { status: 'pending' },
      createdAt: at(now, 0, 5),
      events: [
        event('order_placed', 'Order placed', at(now, 0, 5), '', thabo, 'buyer'),
        event('payment_submitted', 'Simulated EFT payment submitted', at(now, 0, 4), 'Awaiting administrator confirmation.', thabo, 'buyer'),
      ],
    },
    {
      buyer: thabo,
      seller: lerato,
      lines: [{ title: 'SG90 Servo Motor', qty: 2 }],
      payment: { method: 'cod', status: 'due_on_delivery' },
      fulfilment: { status: 'dispatched' },
      createdAt: at(now, 2),
      dispatchedAt: at(now, 1),
      deliveredAt: null,
      trackingNumber: 'MM-TRK-1004',
      events: [
        event('order_placed', 'Order placed', at(now, 2), 'Cash on delivery accepted for postcode 2001.', thabo, 'buyer'),
        event('dispatched', 'Order dispatched', at(now, 1), 'Tracking number: MM-TRK-1004', lerato, 'seller'),
      ],
    },
    {
      buyer: thabo,
      seller: lerato,
      lines: [
        { title: 'HC-SR04 Ultrasonic Sensor', qty: 1 },
        { title: 'DHT22 Temperature and Humidity Sensor', qty: 1 },
      ],
      payment: { method: 'cod', status: 'due_on_delivery' },
      fulfilment: { status: 'delivered' },
      createdAt: at(now, 5),
      dispatchedAt: at(now, 4),
      deliveredAt: at(now, 1),
      trackingNumber: 'MM-TRK-1005',
      events: [
        event('order_placed', 'Order placed', at(now, 5), 'Cash on delivery accepted for postcode 2001.', thabo, 'buyer'),
        event('dispatched', 'Order dispatched', at(now, 4), 'Tracking number: MM-TRK-1005', lerato, 'seller'),
        event('receipt_confirmed', 'Receipt confirmed by buyer', at(now, 1), 'Cash collection is still outstanding.', thabo, 'buyer'),
      ],
    },
    {
      buyer: thabo,
      seller: lerato,
      lines: [{ title: 'MPU6050 Gyroscope Module', qty: 1 }],
      payment: {
        method: 'eft',
        status: 'confirmed',
        reference: eftReference(),
        attempts: 1,
        submittedAt: at(now, 7),
        confirmedAt: at(now, 6),
        confirmedBy: priya._id,
      },
      fulfilment: { status: 'delivered' },
      createdAt: at(now, 8),
      dispatchedAt: at(now, 4),
      deliveredAt: at(now, 2),
      trackingNumber: 'MM-TRK-1006',
      events: [
        event('order_placed', 'Order placed', at(now, 8), '', thabo, 'buyer'),
        event('eft_confirmed', 'Simulated EFT confirmed', at(now, 6), '', priya, 'admin'),
        event('dispatched', 'Order dispatched', at(now, 4), 'Tracking number: MM-TRK-1006', lerato, 'seller'),
        event('receipt_confirmed', 'Receipt confirmed by buyer', at(now, 2), '', thabo, 'buyer'),
      ],
    },
    {
      buyer: thabo,
      seller: lerato,
      lines: [{ title: '9V 1A Power Adapter', qty: 1 }],
      payment: { method: 'cod', status: 'due_on_delivery' },
      fulfilment: { status: 'pending' },
      createdAt: at(now, 6),
      events: [
        event('order_placed', 'Order placed', at(now, 6), 'Cash on delivery accepted. Dispatch is overdue for review.', thabo, 'buyer'),
      ],
    },
    {
      buyer: thabo,
      seller: sipho,
      lines: [{ title: 'NodeMCU ESP8266 Board', qty: 1 }],
      payment: {
        method: 'eft',
        status: 'confirmed',
        reference: eftReference(),
        attempts: 1,
        submittedAt: at(now, 6),
        confirmedAt: at(now, 5),
        confirmedBy: priya._id,
      },
      fulfilment: { status: 'delivered' },
      createdAt: at(now, 6, 4),
      dispatchedAt: at(now, 4),
      deliveredAt: at(now, 3),
      trackingNumber: 'MM-TRK-1008',
      events: [
        event('order_placed', 'Order placed', at(now, 6, 4), '', thabo, 'buyer'),
        event('eft_confirmed', 'Simulated EFT confirmed', at(now, 5), '', priya, 'admin'),
        event('dispatched', 'Order dispatched', at(now, 4), 'Tracking number: MM-TRK-1008', sipho, 'seller'),
        event('receipt_confirmed', 'Receipt confirmed by buyer', at(now, 3), '', thabo, 'buyer'),
      ],
    },
    {
      buyer: thabo,
      seller: lerato,
      lines: [{ title: 'DHT22 Temperature and Humidity Sensor', qty: 1 }],
      payment: {
        method: 'eft',
        status: 'confirmed',
        reference: eftReference(),
        attempts: 1,
        submittedAt: at(now, 8),
        confirmedAt: at(now, 7),
        confirmedBy: priya._id,
      },
      fulfilment: { status: 'delivered' },
      createdAt: at(now, 8, 4),
      dispatchedAt: at(now, 6),
      deliveredAt: at(now, 4),
      trackingNumber: 'MM-TRK-1009',
      refundedCents: 17900,
      events: [
        event('order_placed', 'Order placed', at(now, 8, 4), '', thabo, 'buyer'),
        event('eft_confirmed', 'Simulated EFT confirmed', at(now, 7), '', priya, 'admin'),
        event('dispatched', 'Order dispatched', at(now, 6), 'Tracking number: MM-TRK-1009', lerato, 'seller'),
        event('receipt_confirmed', 'Receipt confirmed by buyer', at(now, 4), '', thabo, 'buyer'),
        event('refund_completed', 'Refund completed', at(now, 2), 'Simulated refund of R179.00 for one item.', priya, 'admin'),
      ],
    },
  ];

  const orders = [];
  for (const definition of orderDefinitions) {
    orders.push(await createOrder({ ...definition, productByTitle, priya }));
  }

  const order6 = orders[5];
  const order9 = orders[8];

  await createRefund({
    order: order6,
    item: order6.items[0],
    buyer: thabo,
    seller: lerato,
    reason: 'The MPU6050 board arrived with a cracked solder joint and does not power on.',
    status: 'requested',
    createdAt: at(now, 1),
    events: [
      event('refund_requested', 'Refund requested', at(now, 1), 'The MPU6050 board arrived with a cracked solder joint and does not power on.', thabo, 'buyer'),
    ],
  });

  await createRefund({
    order: order9,
    item: order9.items[0],
    buyer: thabo,
    seller: lerato,
    reason: 'The humidity reading was stuck and the sensor did not respond after reconnecting.',
    status: 'refunded',
    createdAt: at(now, 3),
    decidedAt: at(now, 3),
    completedAt: at(now, 2),
    decisionReason: 'Approved after the returned sensor was inspected.',
    priya,
    events: [
      event('refund_requested', 'Refund requested', at(now, 3), 'The humidity reading was stuck.', thabo, 'buyer'),
      event('refund_approved', 'Refund approved', at(now, 3), 'Approved after the returned sensor was inspected.', priya, 'admin'),
      event('return_received', 'Returned item received by seller', at(now, 2), '', lerato, 'seller'),
      event('refund_completed', 'Simulated refund completed', at(now, 2), 'No real money was transferred.', priya, 'admin'),
    ],
  });

  for (const order of orders) {
    for (const item of order.items) {
      await Product.updateOne({ _id: item.productId }, { $inc: { stock: -item.qty } });
    }
  }

  const marketplace = await addMarketplaceItems({ now });
  return {
    skipped: false,
    users: [lerato.email, thabo.email, priya.email, sipho.email],
    categories: CATEGORY_NAMES.length + marketplace.categories,
    products: PRODUCTS.length + marketplace.productsAdded,
    orders: orders.length,
    refunds: 2,
  };
}

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isDirectRun) {
  await connectDb();
  const result = await seedDatabase({ reset: process.argv.includes('--reset') });
  if (result.skipped) {
    console.log(`[seed] existing demo preserved; added ${result.marketplace.productsAdded} marketplace products`);
  } else {
    console.log('[seed] demo data created');
    console.log(`[seed] users: ${result.users.join(', ')}`);
    console.log(
      `[seed] ${result.categories} categories, ${result.products} products, ${result.orders} orders, ${result.refunds} refunds`,
    );
  }
  await disconnectDb();
}
