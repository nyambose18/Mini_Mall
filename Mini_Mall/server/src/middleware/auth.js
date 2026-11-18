import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/errors.js';

const COOKIE_NAME = 'mm_token';

export function signToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, config.jwtSecret, {
    expiresIn: `${config.jwtDays}d`,
  });
}

export function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProduction,
    path: '/',
    maxAge: config.jwtDays * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProduction,
    path: '/',
  });
}

export function readUserFromToken(req) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return null;
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch {
    return null;
  }
}

export async function requireAuth(req, res, next) {
  try {
    const payload = readUserFromToken(req);
    if (!payload) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Please sign in to continue.');
    }
    const user = await User.findById(payload.sub);
    if (!user) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Your session is no longer valid. Please sign in again.');
    }
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError(401, 'UNAUTHENTICATED', 'Please sign in to continue.'));
    }
    if (!roles.includes(req.user.role)) {
      const label = roles.length === 1 ? `${roles[0]} account` : `${roles.join(' or ')} account`;
      return next(new AppError(403, 'FORBIDDEN', `This area is only available to a ${label}.`));
    }
    return next();
  };
}