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
  verifyEmailSchema,
} from '../validators/auth.validator.js';

const r = Router();

if (process.env.AUTH_ROUTE_DEBUG === 'true') {
  // Helps verify that the auth router was actually mounted in production.
  // Enable temporarily by setting AUTH_ROUTE_DEBUG=true and restarting the API.
  // Endpoints are relative to the /auth mount in routes/index.js.
  console.log('[TeacherPoint API] Auth routes mounted:', {
    register: 'POST /auth/register',
    login: 'POST /auth/login',
    me: 'GET /auth/me',
  });
}

r.post('/register', validate(registerSchema), c.register);
r.post('/verify-email', verifyJWT, authRateLimit, validate(verifyEmailSchema), c.verifyEmail);
r.post('/resend-verification', verifyJWT, authRateLimit, c.resendVerification);
r.post('/login', authRateLimit, validate(loginSchema), c.login);
r.post('/refresh', validate(refreshSchema), c.refresh);
r.post('/logout', verifyJWT, c.logout);
r.post('/forgot-password', c.forgotPassword);
r.post('/reset-password', validate(resetSchema), c.resetPassword);
r.get('/me', verifyJWT, c.me);
r.patch('/profile', verifyJWT, validate(updateProfileSchema), c.updateProfile);

export default r;
