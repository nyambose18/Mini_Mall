import express from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { config } from '../config.js';
import { User } from '../models/User.js';
import {
  clearAuthCookie,
  readUserFromToken,
  setAuthCookie,
  signToken,
} from '../middleware/auth.js';
import { AppError, asyncHandler, parse } from '../utils/errors.js';

const router = express.Router();

const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
});

const demoSchema = z.object({
  role: z.enum(['buyer', 'seller', 'admin']),
});

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = parse(loginSchema, req.body);
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
    }
    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
    }
    setAuthCookie(res, signToken(user));
    res.json({ user: user.toSafeJSON() });
  }),
);

router.post(
  '/demo',
  asyncHandler(async (req, res) => {
    if (!config.demoLogin) {
      throw new AppError(404, 'DEMO_LOGIN_DISABLED', 'Demo sign-in is turned off.');
    }
    const { role } = parse(demoSchema, req.body);
    const email = config.demoAccounts[role];
    const user = await User.findOne({ email });
    if (!user) {
      throw new AppError(
        404,
        'DEMO_ACCOUNT_MISSING',
        'The demo account has not been seeded yet. Restart the server to seed it.',
      );
    }
    setAuthCookie(res, signToken(user));
    res.json({ user: user.toSafeJSON() });
  }),
);

router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    clearAuthCookie(res);
    res.json({ ok: true });
  }),
);

router.get(
  '/me',
  asyncHandler(async (req, res) => {
    const payload = readUserFromToken(req);
    if (!payload) return res.json({ user: null });
    const user = await User.findById(payload.sub);
    return res.json({ user: user ? user.toSafeJSON() : null });
  }),
);

export default router;