import { createApp } from './app.js';
import { config } from './config.js';
import { connectDb, disconnectDb } from './db.js';
import { isDatabaseEmpty, seedDatabase } from './seed/seed.js';
import { releaseExpiredEftOrders } from './services/orders.js';

await connectDb();

if (await isDatabaseEmpty()) {
  console.log('[seed] empty database — adding demo data');
  await seedDatabase();
}

const app = createApp();
const server = app.listen(config.port, () => {
  console.log(`[api] Mini Mall running at http://localhost:${config.port}`);
  console.log('[demo] Lerato (seller), Thabo (buyer) and Priya (admin) are ready');
});

releaseExpiredEftOrders().catch((error) => {
  console.error('[orders] could not release expired EFT reservations:', error.message);
});

const expiryTimer = setInterval(() => {
  releaseExpiredEftOrders().catch((error) => {
    console.error('[orders] expiry sweep failed:', error.message);
  });
}, 15 * 60 * 1000);
expiryTimer.unref();

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[api] ${signal} received, shutting down`);
  server.close(async () => {
    try {
      await disconnectDb();
    } finally {
      process.exit(0);
    }
  });
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));