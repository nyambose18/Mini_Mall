import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Category } from '../models/Category.js';
import { Product } from '../models/Product.js';
import { User } from '../models/User.js';
import { slugify } from '../utils/text.js';
import { connectDb, disconnectDb } from '../db.js';
import { productPhoto, replaceSeedIllustrations } from './photos.js';

const PRODUCTS = [
  {
    category: 'IT - Routers',
    title: '2.4 GHz Wi-Fi Router',
    model: 'MM-WR300',
    price: 399,
    stock: 12,
    image: 'router.svg',
    voltage: '12 V DC, 1 A adapter included',
    connector: '1x 10/100 Mbps WAN, 4x 10/100 Mbps LAN, DC barrel jack',
    compatibility: 'Ethernet broadband modems and 2.4 GHz Wi-Fi devices; no built-in fibre ONT or DSL modem',
    contents: '1x router, 1x power adapter, 1x Ethernet patch cable',
    description: 'Demo wireless router for basic home and classroom networking. Practise DHCP, wireless setup and connecting a small LAN.',
  },
  {
    category: 'IT - Routers',
    title: 'Gigabit Ethernet Router',
    model: 'MM-GR5',
    price: 699,
    stock: 8,
    image: 'wired-router.svg',
    voltage: '12 V DC, 1 A adapter included',
    connector: '1x Gigabit WAN, 4x Gigabit LAN, DC barrel jack',
    compatibility: '10/100/1000 Mbps Ethernet networks; wired only, no Wi-Fi or built-in modem',
    contents: '1x wired router, 1x power adapter, 1x Ethernet patch cable',
    description: 'Demo wired router for learning IP addressing, NAT and DHCP. Connect an access point separately when wireless coverage is needed.',
  },
  {
    category: 'IT - Network switches',
    title: '5-Port Gigabit Network Switch',
    model: 'MM-SW5G',
    price: 299,
    stock: 18,
    image: 'network-switch.svg',
    voltage: '5 V DC, 1 A adapter included',
    connector: '5x RJ45 10/100/1000 Mbps ports, DC barrel jack',
    compatibility: 'Cat5e and Cat6 Ethernet cabling; unmanaged, no PoE output',
    contents: '1x five-port switch, 1x power adapter',
    description: 'Demo plug-and-play switch for linking PCs, a router and other wired devices. One port is used by the connection back to the router.',
  },
  {
    category: 'IT - Network switches',
    title: '8-Port Gigabit Network Switch',
    model: 'MM-SW8G',
    price: 499,
    stock: 10,
    image: 'network-switch-8.svg',
    voltage: '5 V DC, 1 A adapter included',
    connector: '8x RJ45 10/100/1000 Mbps ports, DC barrel jack',
    compatibility: 'Cat5e and Cat6 Ethernet cabling; unmanaged, no VLAN configuration or PoE output',
    contents: '1x eight-port switch, 1x power adapter',
    description: 'Demo desktop switch for a small computer lab or home network. Expand the number of wired connections without configuring individual ports.',
  },
  {
    category: 'IT - Network cables',
    title: 'Cat6 Ethernet Patch Cable - 1 m',
    model: 'MM-CAT6-1M',
    price: 39,
    stock: 40,
    image: 'ethernet.svg',
    voltage: 'Passive data cable; no power supply required',
    connector: 'RJ45 male to RJ45 male, straight-through',
    compatibility: 'RJ45 Ethernet ports on routers, switches, PCs and development boards',
    contents: '1x 1 m Cat6 UTP patch cable',
    description: 'Demo short patch lead for tidy desktop connections and networking practicals.',
  },
  {
    category: 'IT - Network cables',
    title: 'Cat6 Ethernet Patch Cable - 5 m',
    model: 'MM-CAT6-5M',
    price: 89,
    stock: 30,
    image: 'ethernet.svg',
    voltage: 'Passive data cable; no power supply required',
    connector: 'RJ45 male to RJ45 male, straight-through',
    compatibility: 'RJ45 Ethernet ports on routers, switches, PCs and development boards',
    contents: '1x 5 m Cat6 UTP patch cable',
    description: 'Demo longer patch lead for connecting a workstation to a nearby router or switch.',
  },
  {
    category: 'Mechatronics - Motors & actuators',
    title: '28BYJ-48 Stepper Motor and Driver Kit',
    model: '28BYJ-48-5V-KIT',
    price: 119,
    stock: 20,
    image: 'stepper.svg',
    voltage: '5 V DC motor supply; use a separate supply with a shared controller ground',
    connector: '5-pin motor plug, ULN2003 driver headers and power terminals',
    compatibility: 'Arduino sequencing projects with the included ULN2003 driver; never drive the motor directly from GPIO',
    contents: '1x 5 V 28BYJ-48 geared stepper motor, 1x ULN2003 driver board',
    description: 'Demo starter kit for learning step sequences, position control and geared motion in small mechanisms.',
  },
  {
    category: 'Mechatronics - Motors & actuators',
    title: 'TT Gear Motor and Wheel Pair',
    model: 'MM-TT-2WD',
    price: 159,
    stock: 16,
    image: 'gearmotor.svg',
    voltage: '3-6 V DC motor supply; separate motor power recommended',
    connector: 'Two solder terminals per motor and matching wheel hubs',
    compatibility: 'Two-wheel robot chassis and a suitably rated dual H-bridge motor driver',
    contents: '2x TT geared DC motors, 2x matching wheels',
    description: 'Demo motor-and-wheel pair for a beginner mobile robot. Use a motor driver to control direction and speed.',
  },
  {
    category: 'Mechatronics - Mechanical parts',
    title: '2WD Robot Chassis Kit',
    model: 'MM-CHASSIS-2WD',
    price: 199,
    stock: 10,
    image: 'chassis.svg',
    voltage: 'Passive mechanical kit; no power supply required',
    connector: 'Bolt-on motor brackets, standoffs and caster mounting holes',
    compatibility: 'TT geared DC motors; motors, wheels, controller and battery sold separately',
    contents: '1x chassis plate, 2x motor brackets, 1x caster, mounting hardware',
    description: 'Demo starter frame for assembling a two-wheel mobile robot. Mount your own electronics and motor pair to complete the build.',
  },
  {
    category: 'Mechatronics - Mechanical parts',
    title: 'GT2 Timing Belt and Pulley Kit',
    model: 'MM-GT2-KIT',
    price: 149,
    stock: 14,
    image: 'timing-belt.svg',
    voltage: 'Passive mechanical kit; no power supply required',
    connector: '5 mm pulley bores with grub screws; 2 mm belt pitch',
    compatibility: '5 mm motor shafts and 6 mm wide GT2 belt mechanisms; check shaft dimensions before ordering',
    contents: '1x 1 m open-ended GT2 belt, 2x 20-tooth pulleys, 1x hex key',
    description: 'Demo belt-drive components for basic motion-transfer experiments and small linear mechanisms.',
  },
  {
    category: 'Mechatronics - Control modules',
    title: '4-Channel 5V Relay Module',
    model: 'MM-RELAY4-5V',
    price: 129,
    stock: 15,
    image: 'relay.svg',
    voltage: '5 V DC module supply and 5 V control signals; demo loads limited to 12 V DC, 1 A',
    connector: 'VCC/GND and IN1-IN4 headers; COM/NO/NC screw terminals',
    compatibility: '5 V controllers and low-voltage DC demonstration loads; 3.3 V controllers require a suitable interface',
    contents: '1x four-channel relay module',
    description: 'Demo output module for switching low-voltage lamps or other small DC loads from a controller. This listing is for low-voltage classroom use.',
  },
  {
    category: 'Mechatronics - Control modules',
    title: 'Lever Limit Switch Pack',
    model: 'MM-LIMIT-3',
    price: 69,
    stock: 25,
    image: 'limit-switch.svg',
    voltage: 'Passive dry contacts for 3.3 V or 5 V logic inputs',
    connector: 'COM, NO and NC solder terminals',
    compatibility: 'Arduino, ESP32 and Pico inputs with a pull-up resistor and software debouncing',
    contents: '3x lever microswitches',
    description: 'Demo position switches for end stops, homing and simple mechanism feedback.',
  },
];

export async function addMarketplaceItems({ now = new Date() } = {}) {
  const seller = await User.findOne({ email: 'lerato@minimall.test', role: 'seller' });
  if (!seller) return { skipped: true, productsAdded: 0 };

  const categories = new Map();
  for (const name of new Set(PRODUCTS.map((product) => product.category))) {
    const category = await Category.findOneAndUpdate(
      { name },
      { $setOnInsert: { name, slug: slugify(name), active: true, createdAt: now, updatedAt: now } },
      { upsert: true, new: true, timestamps: false },
    );
    categories.set(name, category);
  }

  let productsAdded = 0;
  for (const row of PRODUCTS) {
    // Insert only: restarting must preserve seller edits, stock and moderation decisions.
    const result = await Product.updateOne(
      { sellerId: seller._id, model: row.model },
      {
        $setOnInsert: {
          sellerId: seller._id,
          categoryId: categories.get(row.category)._id,
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
          status: 'approved',
          approvedAt: now,
          createdAt: now,
          updatedAt: now,
        },
      },
      { upsert: true, timestamps: false, runValidators: true },
    );
    productsAdded += result.upsertedCount;
  }

  const photosUpdated = await replaceSeedIllustrations();
  return { skipped: false, categories: categories.size, productsAdded, photosUpdated };
}

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isDirectRun) {
  try {
    await connectDb();
    console.log('[marketplace]', await addMarketplaceItems());
  } finally {
    await disconnectDb();
  }
}
