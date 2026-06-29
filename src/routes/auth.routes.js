import { Router } from 'express';
import * as c from '../controllers/auth.controller.js';
import * as wc from '../controllers/whatsappAuth.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { verifyJWT } from '../middleware/auth.middleware.js';
import { authRateLimit } from '../middleware/rateLimit.middleware.js';
import {
  registerSchema,
  forgotPasswordSchema,
  loginSchema,
  refreshSchema,
  resetSchema,
  changePasswordSchema,
  googleLoginSchema,
  updateProfileSchema,
  verifyEmailSchema,
  whatsappSendOtpSchema,
  whatsappVerifyOtpSchema,
  whatsappLoginSchema,
  whatsappSignupSchema,
} from '../validators/auth.validator.js';

const r = Router();

if (process.env.AUTH_ROUTE_DEBUG === 'true') {
  // Helps verify that the auth router was actually mounted in production.
  // Enable temporarily by setting AUTH_ROUTE_DEBUG=true and restarting the API.
  // Endpoints are relative to the /auth mount in routes/index.js.
  console.log('[TeacherPoint API] Auth routes mounted:', {
    register: 'POST /auth/register',
    login: 'POST /auth/login',
    googleLogin: 'POST /auth/google-login',
    me: 'GET /auth/me',
  });
}

r.post('/register', validate(registerSchema), c.register);
r.post('/verify-email', verifyJWT, authRateLimit, validate(verifyEmailSchema), c.verifyEmail);
r.post('/resend-verification', verifyJWT, authRateLimit, c.resendVerification);
r.post('/login', authRateLimit, validate(loginSchema), c.login);
r.post('/google-login', authRateLimit, validate(googleLoginSchema), c.googleLogin);
r.post('/whatsapp/send-otp', authRateLimit, validate(whatsappSendOtpSchema), wc.sendOtp);
r.post('/whatsapp/verify-otp', authRateLimit, validate(whatsappVerifyOtpSchema), wc.verifyOtp);
r.post('/whatsapp/login', authRateLimit, validate(whatsappLoginSchema), wc.login);
r.post('/whatsapp/signup', authRateLimit, validate(whatsappSignupSchema), wc.signup);
r.post('/refresh', validate(refreshSchema), c.refresh);
r.post('/logout', verifyJWT, c.logout);
r.post('/forgot-password', authRateLimit, validate(forgotPasswordSchema), c.forgotPassword);
r.post('/reset-password', validate(resetSchema), c.resetPassword);
r.post('/change-password', verifyJWT, authRateLimit, validate(changePasswordSchema), c.changePassword);
r.get('/me', verifyJWT, c.me);
r.patch('/profile', verifyJWT, validate(updateProfileSchema), c.updateProfile);

export default r;
