import { Router } from 'express';
import * as c from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { verifyJWT } from '../middleware/auth.middleware.js';
import { authRateLimit } from '../middleware/rateLimit.middleware.js';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  resetSchema,
  updateProfileSchema,
} from '../validators/auth.validator.js';

const r = Router();

r.post('/register', validate(registerSchema), c.register);
r.post('/login', authRateLimit, validate(loginSchema), c.login);
r.post('/refresh', validate(refreshSchema), c.refresh);
r.post('/logout', verifyJWT, c.logout);
r.post('/forgot-password', c.forgotPassword);
r.post('/reset-password', validate(resetSchema), c.resetPassword);
r.get('/me', verifyJWT, c.me);
r.patch('/profile', verifyJWT, validate(updateProfileSchema), c.updateProfile);

export default r;
