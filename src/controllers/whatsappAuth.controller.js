import * as tokenService from '../services/token.service.js';
import {
  sendWhatsappOtp,
  verifyWhatsappOtp,
  loginWithVerifiedPhone,
  signupWithVerifiedPhone,
} from '../services/whatsappAuth.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { withStaffRole } from '../utils/adminStaff.js';
import { recordUserIpActivity } from '../services/ipMonitor.service.js';
import logger from '../config/logger.js';

const userId = (u) => (u._id ? String(u._id) : u.id);

const issue = (u) => ({
  accessToken: tokenService.signAccess(userId(u), u.role, u.email || ''),
  refreshToken: tokenService.signRefresh(userId(u)),
});

const needsEmailVerification = (user) =>
  user.provider !== 'whatsapp' &&
  (user.role === 'teacher' || user.role === 'student') &&
  !user.isVerified;

const authPayload = async (user, extra = {}) => ({
  user: await withStaffRole(user),
  ...issue(user),
  profileComplete: user.profileComplete,
  requiresEmailVerification: needsEmailVerification(user),
  ...extra,
});

export const sendOtp = asyncHandler(async (req, res) => {
  const { phone, purpose } = req.body;
  const result = await sendWhatsappOtp(phone, purpose);
  ApiResponse.ok(res, result, 'OTP sent successfully.');
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const { phone, otp, purpose } = req.body;
  const result = await verifyWhatsappOtp(phone, otp, purpose);
  ApiResponse.ok(res, result, 'Phone verified successfully.');
});

export const login = asyncHandler(async (req, res) => {
  const { phone } = req.body;
  const result = await loginWithVerifiedPhone(phone);

  if (result.newUser) {
    return ApiResponse.ok(res, { newUser: true, phone: result.phone }, 'No account found for this number');
  }

  const { user } = result;

  try {
    await recordUserIpActivity({ user, req, action: 'login' });
  } catch (err) {
    logger.error(`[whatsapp-auth] ip-monitor login: ${err.message}`);
  }

  ApiResponse.ok(res, await authPayload(user), 'Login successful');
});

export const signup = asyncHandler(async (req, res) => {
  const { name, phone, role } = req.body;
  const user = await signupWithVerifiedPhone({ name, phone, role });

  try {
    await recordUserIpActivity({ user, req, action: 'register' });
  } catch (err) {
    logger.error(`[whatsapp-auth] ip-monitor signup: ${err.message}`);
  }

  ApiResponse.created(res, await authPayload(user), 'Account created with WhatsApp');
});
