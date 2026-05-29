import rateLimit from 'express-rate-limit';
import env from '../config/env.js';

export const apiRateLimit = rateLimit({
  windowMs: env.rateLimitWindowMs,
  max: env.rateLimitMax,
  skip: (req) => req.method === 'OPTIONS',
  validate: { trustProxy: true },
});

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skip: (req) => req.method === 'OPTIONS',
  validate: { trustProxy: true },
});
