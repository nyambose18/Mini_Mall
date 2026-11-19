import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(here, '..');
const projectRoot = path.resolve(serverRoot, '..');

function int(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function bool(value, fallback) {
  if (value === undefined) return fallback;
  return !['false', '0', 'no', 'off'].includes(String(value).toLowerCase());
}

const defaultCodPostcodes = ['2001', '2196', '0002', '0181', '4001', '8001', '7441', '6001'];

export const config = {
  port: int(process.env.PORT, 4000),
  serverRoot,
  projectRoot,
  dataDir: path.resolve(projectRoot, process.env.MONGO_DATA_DIR || 'data/mongodb'),
  mongoUri: (process.env.MONGO_URI || '').trim(),
  uploadDir: path.join(serverRoot, 'uploads'),
  jwtSecret: process.env.JWT_SECRET || 'dev-mini-mall-secret-change-me',
  jwtDays: 7,
  demoLogin: bool(process.env.DEMO_LOGIN, false),
  deliveryFeeCents: int(process.env.DELIVERY_FEE, 50) * 100,
  outlyingDeliveryFeeCents: int(process.env.OUTLYING_DELIVERY_FEE, 75) * 100,
  eftExpiryHours: int(process.env.EFT_EXPIRY_HOURS, 24),
  codDispatchWorkingDays: int(process.env.COD_DISPATCH_WORKING_DAYS, 2),
  refundWindowDays: int(process.env.REFUND_WINDOW_DAYS, 7),
  codEligiblePostcodes: (process.env.COD_ELIGIBLE_POSTCODES
    ? process.env.COD_ELIGIBLE_POSTCODES.split(',')
    : defaultCodPostcodes
  )
    .map((code) => code.trim())
    .filter(Boolean),
  demoAccounts: {
    buyer: 'thabo@minimall.test',
    seller: 'lerato@minimall.test',
    admin: 'priya@minimall.test',
  },
  isProduction: process.env.NODE_ENV === 'production',
};
