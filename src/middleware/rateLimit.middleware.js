import rateLimit from 'express-rate-limit';
import env from '../config/env.js';

const isDev = env.NODE_ENV !== 'production';
const rateLimitDisabled = String(process.env.RATE_LIMIT_DISABLED || '').toLowerCase() === 'true';

function skipRateLimit(req) {
  if (rateLimitDisabled || isDev) return true;
  if (req.method === 'OPTIONS') return true;
  const path = req.path || '';
  if (path === '/health' || path === '/api/health') return true;
  return false;
}

const rateLimitMessage = {
  success: false,
  message: 'Too many requests, please try again later.',
  errors: [],
};

export const apiRateLimit = rateLimit({
  windowMs: env.rateLimitWindowMs,
  max: env.rateLimitMax,
  skip: skipRateLimit,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage,
  validate: { trustProxy: true },
});

/** Stricter limit for login / OTP — still skipped in local development. */
export const authRateLimit = rateLimit({
  windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  max: Number(process.env.AUTH_RATE_LIMIT_MAX || (isDev ? 1000 : 60)),
  skip: skipRateLimit,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage,
  validate: { trustProxy: true },
});
