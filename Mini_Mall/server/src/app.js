import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import cookieParser from 'cookie-parser';
import { config } from './config.js';
import { errorHandler } from './utils/errors.js';
import authRoutes from './routes/auth.js';
import catalogRoutes from './routes/catalog.js';
import cartRoutes from './routes/cart.js';
import orderRoutes from './routes/orders.js';
import refundRoutes from './routes/refunds.js';
import sellerRoutes from './routes/seller.js';
import adminRoutes from './routes/admin.js';
import uploadRoutes from './routes/uploads.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, name: 'Mini Mall API' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api', catalogRoutes);
  app.use('/api/cart', cartRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/refunds', refundRoutes);
  app.use('/api/seller', sellerRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/uploads', uploadRoutes);

  app.use('/uploads', express.static(config.uploadDir));
  app.use('/api', (_req, res) => {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'That API route does not exist.' },
    });
  });

  const clientDist = path.join(config.projectRoot, 'client', 'dist');
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
  } else {
    app.get('*', (_req, res) => {
      res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Mini Mall API is running.' } });
    });
  }

  app.use(errorHandler);
  return app;
}