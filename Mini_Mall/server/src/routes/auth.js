import express from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { config } from '../config.js';
import { User } from '../models/User.js';
import {
  clearAuthCookie,
  readUserFromToken,
  requireApprovedSeller,
  setAuthCookie,
  signToken,
} from '../middleware/auth.js';
import { AppError, asyncHandler, parse } from '../utils/errors.js';

const router = express.Router();

const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
});

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name.').max(100),
  email: z.string().trim().email('Enter a valid email address.').max(254),
  password: z.string().min(12, 'Use at least 12 characters.').refine(
    (value) => Buffer.byteLength(value, 'utf8') <= 72,
    'Use a password of no more than 72 UTF-8 bytes.',
  ),
  role: z.enum(['buyer', 'seller']),
  phone: z.string().trim().max(30).optional().default(''),
  address: z.string().trim().max(300).optional().default(''),
  postcode: z.string().trim().max(12).optional().default(''),
}).strict().superRefine((input, context) => {
  if (input.role === 'seller' && input.phone.length < 5) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['phone'], message: 'Enter a contact number for your seller application.' });
  }
});

router.post('/register', asyncHandler(async (req, res) => {
  const { password, ...input } = parse(registerSchema, req.body);
  const email = input.email.toLowerCase();
  if (await User.exists({ email })) {
    throw new AppError(409, 'EMAIL_IN_USE', 'An account with this email already exists. Sign in instead.', {
      fields: { email: 'This email is already registered.' },
    });
  }
  const user = await User.create({
    ...input, email, passwordHash: await bcrypt.hash(password, 12),
    ...(input.role === 'seller' ? { sellerStatus: 'pending' } : {}),
  });
  if (user.role === 'buyer') {
    setAuthCookie(res, signToken(user));
  } else {
    clearAuthCookie(res);
  }
  res.status(201).json({
    user: user.toSafeJSON(),
    requiresApproval: user.role === 'seller',
    message: user.role === 'seller'
      ? 'Application received. You can sign in after the administrator approves your seller account.'
      : 'Your buyer account is ready.',
  });
}));

const demoSchema = z.object({
  role: z.enum(['buyer', 'seller', 'admin']),
});

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = parse(loginSchema, req.body);
    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
    if (!user) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
    }
    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
    }
    requireApprovedSeller(user);
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
    requireApprovedSeller(user);
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
    if (user?.role === 'seller' && user.sellerStatus !== 'approved') {
      clearAuthCookie(res);
      return res.json({ user: null });
    }
    return res.json({ user: user ? user.toSafeJSON() : null });
  }),
);

export default router;
