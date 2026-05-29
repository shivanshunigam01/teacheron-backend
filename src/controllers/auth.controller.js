import bcrypt from 'bcrypt';
import crypto from 'crypto';
import User from '../models/User.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { toJSON } from '../utils/serialize.js';
import env from '../config/env.js';
import * as tokenService from '../services/token.service.js';
import { sendMail } from '../services/email.service.js';
import { sendWelcomeEmail } from '../services/welcomeEmail.service.js';
import {
  issueEmailVerificationOtp,
  verifyEmailOtp,
  resendEmailVerificationOtp,
  sendTeacherWelcomeIfReady,
} from '../services/emailVerification.service.js';
import logger from '../config/logger.js';
import { computeProfileComplete, initialsFromName } from '../utils/profileComplete.js';
import { recordUserIpActivity } from '../services/ipMonitor.service.js';
import { withStaffRole } from '../utils/adminStaff.js';

const userId = (u) => (u._id ? String(u._id) : u.id);

const issue = (u) => ({
  accessToken: tokenService.signAccess(userId(u), u.role, u.email),
  refreshToken: tokenService.signRefresh(userId(u)),
});

const authPayload = async (user, extra = {}) => ({
  user: await withStaffRole(user),
  ...issue(user),
  profileComplete: user.profileComplete,
  requiresEmailVerification: user.role === 'teacher' && !user.isVerified,
  ...extra,
});

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!['student', 'teacher'].includes(role)) {
    throw ApiError.badRequest('Only student or tutor accounts can self-register');
  }
  if (await User.findOne({ email: email.toLowerCase() })) {
    throw ApiError.conflict('Email already exists');
  }

  const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    passwordHash,
    role,
    isVerified: role !== 'teacher',
    profileComplete: false,
    welcomeEmailSent: false,
    teacherProfile:
      role === 'teacher'
        ? {
            initials: initialsFromName(name),
            gradient: 'from-blue-500 to-purple-500',
            verified: false,
            online: true,
            subjects: [],
          }
        : undefined,
  });

  user.profileComplete = computeProfileComplete(user);
  await user.save();

  try {
    await recordUserIpActivity({ user, req, action: 'register' });
  } catch (err) {
    logger.error(`[ip-monitor] register: ${err.message}`);
  }

  const payloadExtra = {};

  if (role === 'teacher') {
    try {
      const otpResult = await issueEmailVerificationOtp(user);
      payloadExtra.verificationEmailSent = otpResult.sent;
      if (env.NODE_ENV === 'development' && otpResult.devOtp) {
        payloadExtra.devOtp = otpResult.devOtp;
      }
      if (!otpResult.sent) {
        payloadExtra.verificationEmailError =
          otpResult.reason === 'not_configured'
            ? 'SMTP is not configured on this server'
            : 'Could not send verification email';
      }
    } catch (err) {
      payloadExtra.verificationEmailSent = false;
      payloadExtra.verificationEmailError = err.message;
      logger.error(`[otp-email] register: ${err.message}`);
    }

    return ApiResponse.created(
      res,
      await authPayload(user, payloadExtra),
      payloadExtra.verificationEmailSent
        ? 'Account created — check your email for a verification code'
        : 'Account created — verification email could not be sent',
    );
  }

  // Student: welcome email immediately on signup
  let welcomeEmailSent = false;
  let welcomeEmailError;
  try {
    const mailResult = await sendWelcomeEmail({ name, email: user.email, role });
    welcomeEmailSent = mailResult.sent;
    if (mailResult.sent) {
      user.welcomeEmailSent = true;
      await user.save();
    } else if (mailResult.stub) {
      welcomeEmailError =
        mailResult.reason === 'not_configured'
          ? 'SMTP is not configured on this server'
          : 'Email service unavailable';
    }
  } catch (err) {
    welcomeEmailError = err?.message || 'Failed to send welcome email';
    logger.error(`[welcome-email] ${welcomeEmailError}`);
  }

  const payload = { ...(await authPayload(user)), welcomeEmailSent };
  if (env.NODE_ENV === 'development' && welcomeEmailError) {
    payload.welcomeEmailError = welcomeEmailError;
  }

  ApiResponse.created(
    res,
    payload,
    welcomeEmailSent ? 'Registered successfully — welcome email sent' : 'Registered successfully',
  );
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('+emailVerificationOtpHash');
  if (!user) throw ApiError.notFound('User not found');
  if (user.role !== 'teacher') {
    throw ApiError.badRequest('Email verification is only required for tutor accounts');
  }
  if (user.isVerified) {
    return ApiResponse.ok(res, await authPayload(user), 'Email already verified');
  }

  try {
    await verifyEmailOtp(user, req.body.otp);
  } catch (err) {
    throw ApiError.badRequest(err.message);
  }

  const refreshed = await User.findById(user._id);
  ApiResponse.ok(
    res,
    await authPayload(refreshed),
    'Email verified — complete your tutor profile to continue',
  );
});

export const resendVerification = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw ApiError.notFound('User not found');
  if (user.role !== 'teacher') {
    throw ApiError.badRequest('Email verification is only required for tutor accounts');
  }
  if (user.isVerified) {
    return ApiResponse.ok(res, { alreadyVerified: true }, 'Email already verified');
  }

  try {
    const result = await resendEmailVerificationOtp(user);
    const data = { sent: result.sent, ...(env.NODE_ENV === 'development' && result.devOtp ? { devOtp: result.devOtp } : {}) };
    ApiResponse.ok(res, data, result.sent ? 'Verification code sent' : 'Could not send verification code');
  } catch (err) {
    throw ApiError.badRequest(err.message);
  }
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
    throw ApiError.unauthorized('Invalid email or password');
  }
  if (!user.isActive) throw ApiError.forbidden('Account is disabled');

  user.profileComplete = computeProfileComplete(user);
  await user.save();

  try {
    await recordUserIpActivity({ user, req, action: 'login' });
  } catch (err) {
    logger.error(`[ip-monitor] login: ${err.message}`);
  }

  ApiResponse.ok(res, await authPayload(user), 'Login successful');
});

export const refresh = asyncHandler(async (req, res) => {
  const p = tokenService.verifyRefresh(req.body.refreshToken);
  const user = await User.findById(p.sub);
  if (!user || !user.isActive) throw ApiError.unauthorized();
  ApiResponse.ok(
    res,
    { accessToken: tokenService.signAccess(userId(user), user.role, user.email) },
    'Token refreshed',
  );
});

export const logout = asyncHandler(async (req, res) => res.status(204).send());

export const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw ApiError.notFound('User not found');
  ApiResponse.ok(res, await withStaffRole(user), 'Profile fetched');
});

export const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw ApiError.notFound('User not found');

  if (user.role === 'teacher' && !user.isVerified) {
    throw ApiError.forbidden('Verify your email before completing your tutor profile');
  }

  const { name, phone, phoneCountryCode, avatarUrl, theme, locale, teacherProfile, studentProfile } = req.body;

  if (name) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (phoneCountryCode !== undefined) user.phoneCountryCode = phoneCountryCode;
  if (avatarUrl !== undefined) user.avatarUrl = avatarUrl || undefined;
  if (theme) user.theme = theme;
  if (locale) user.locale = locale;

  if (user.role === 'teacher' && teacherProfile) {
    const merged = {
      ...(user.teacherProfile?.toObject?.() || user.teacherProfile || {}),
      ...teacherProfile,
      initials: user.teacherProfile?.initials || initialsFromName(user.name),
    };
    if (teacherProfile.teachingSubjects?.length) {
      merged.subjects = teacherProfile.teachingSubjects.map((entry) => entry.name);
    }
    user.teacherProfile = merged;
  }

  if (user.role === 'student' && studentProfile) {
    user.studentProfile = {
      ...(user.studentProfile?.toObject?.() || user.studentProfile || {}),
      ...studentProfile,
    };
  }

  const wasComplete = user.profileComplete;
  user.profileComplete = computeProfileComplete(user);
  await user.save();

  let welcomeEmailSent = false;
  if (user.role === 'teacher' && user.profileComplete && !wasComplete) {
    const welcome = await sendTeacherWelcomeIfReady(user);
    welcomeEmailSent = Boolean(welcome.sent);
  }

  ApiResponse.ok(
    res,
    { ...toJSON(user), welcomeEmailSent, requiresEmailVerification: false },
    welcomeEmailSent ? 'Profile complete — welcome email sent' : 'Profile updated',
  );
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email?.toLowerCase() });
  if (user) {
    user.passwordResetToken = crypto.randomBytes(24).toString('hex');
    user.passwordResetExpires = Date.now() + 3600000;
    await user.save();
    try {
      await sendMail({
        to: user.email,
        subject: 'Reset password',
        html: `Token: ${user.passwordResetToken}`,
      });
    } catch {
      /* optional */
    }
  }
  ApiResponse.ok(res, { message: 'If email exists, reset instructions were sent' }, 'OK');
});

export const resetPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({
    passwordResetToken: req.body.token,
    passwordResetExpires: { $gt: new Date() },
  });
  if (!user) throw ApiError.badRequest('Invalid or expired token');
  user.passwordHash = await bcrypt.hash(req.body.password, env.BCRYPT_ROUNDS);
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  ApiResponse.ok(res, { message: 'Password reset successful' }, 'Password reset successful');
});
