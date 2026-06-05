import bcrypt from 'bcrypt';
import crypto from 'crypto';
import User from '../models/User.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { toJSON } from '../utils/serialize.js';
import env from '../config/env.js';
import * as tokenService from '../services/token.service.js';
import {
  sendPasswordResetEmail,
  canSendPasswordReset,
} from '../services/passwordResetEmail.service.js';
import {
  issueEmailVerificationOtp,
  verifyEmailOtp,
  resendEmailVerificationOtp,
  sendTeacherWelcomeIfReady,
  sendStudentWelcomeIfReady,
} from '../services/emailVerification.service.js';
import logger from '../config/logger.js';
import { computeProfileComplete, initialsFromName } from '../utils/profileComplete.js';
import { recordUserIpActivity } from '../services/ipMonitor.service.js';
import { withStaffRole } from '../utils/adminStaff.js';
import { OAuth2Client } from 'google-auth-library';
import { findOrCreateGoogleUser } from '../services/googleAuthLogin.service.js';

const userId = (u) => (u._id ? String(u._id) : u.id);

const issue = (u) => ({
  accessToken: tokenService.signAccess(userId(u), u.role, u.email),
  refreshToken: tokenService.signRefresh(userId(u)),
});

const needsEmailVerification = (user) =>
  (user.role === 'teacher' || user.role === 'student') && !user.isVerified;

const authPayload = async (user, extra = {}) => ({
  user: await withStaffRole(user),
  ...issue(user),
  profileComplete: user.profileComplete,
  requiresEmailVerification: needsEmailVerification(user),
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
    provider: 'local',
    role,
    isVerified: false,
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
    studentProfile: role === 'student' ? {} : undefined,
  });

  user.profileComplete = computeProfileComplete(user);
  await user.save();

  try {
    await recordUserIpActivity({ user, req, action: 'register' });
  } catch (err) {
    logger.error(`[ip-monitor] register: ${err.message}`);
  }

  const payloadExtra = {};

  try {
    const otpResult = await issueEmailVerificationOtp(user, role);
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
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('+emailVerificationOtpHash');
  if (!user) throw ApiError.notFound('User not found');
  if (user.role !== 'teacher' && user.role !== 'student') {
    throw ApiError.badRequest('Email verification is only required for student and tutor accounts');
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
  const extra = {};

  if (refreshed.role === 'student') {
    const welcome = await sendStudentWelcomeIfReady(refreshed);
    extra.welcomeEmailSent = Boolean(welcome.sent);
  }

  const message =
    refreshed.role === 'teacher'
      ? 'Email verified — complete your tutor profile to continue'
      : extra.welcomeEmailSent
        ? 'Email verified — welcome email sent with course highlights'
        : 'Email verified — you can complete your profile and explore courses';

  ApiResponse.ok(res, await authPayload(refreshed, extra), message);
});

export const resendVerification = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw ApiError.notFound('User not found');
  if (user.role !== 'teacher' && user.role !== 'student') {
    throw ApiError.badRequest('Email verification is only required for student and tutor accounts');
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
  if (!user?.passwordHash) {
    throw ApiError.unauthorized(
      user ? 'This account uses Google sign-in. Continue with Google instead.' : 'Invalid email or password',
    );
  }
  if (!(await bcrypt.compare(password, user.passwordHash))) {
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

export const googleLogin = async (req, res) => {
  try {
    const { credential, role } = req.body;

    console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID);
    console.log('Credential Exists:', !!credential);
    console.log('Credential Length:', credential?.length);

    if (!process.env.GOOGLE_CLIENT_ID?.trim()) {
      return res.status(500).json({
        success: false,
        message: 'Google sign-in is not configured. Set GOOGLE_CLIENT_ID in .env',
        errors: [],
      });
    }

    const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID.trim());

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID.trim(),
      });
      payload = ticket.getPayload();
    } catch (verifyError) {
      console.error('Google Verify Error:', verifyError);

      return res.status(401).json({
        success: false,
        message: 'Invalid or expired Google token',
        errors: [],
      });
    }

    const email = payload?.email?.toLowerCase();
    const sub = payload?.sub;

    if (!email || !sub) {
      return res.status(400).json({
        success: false,
        message: 'Google token is missing required profile fields (email, sub)',
        errors: [],
      });
    }

    const googleUser = {
      googleId: sub,
      email,
      name: payload.name?.trim() || email.split('@')[0],
      picture: payload.picture || '',
      emailVerified: payload.email_verified === true,
    };

    if (!googleUser.emailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Google email must be verified before signing in',
        errors: [],
      });
    }

    const { user, isNewUser, welcomeEmailSent } = await findOrCreateGoogleUser(googleUser, { role });

    try {
      await recordUserIpActivity({ user, req, action: isNewUser ? 'register' : 'login' });
    } catch (err) {
      logger.error(`[google-auth] ip-monitor: ${err.message}`);
    }

    const extra = welcomeEmailSent ? { welcomeEmailSent: true } : {};

    return ApiResponse.ok(
      res,
      await authPayload(user, extra),
      isNewUser ? 'Account created with Google' : 'Google sign-in successful',
    );
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        errors: error.errors || [],
      });
    }

    console.error('Google Login Error:', error);

    return res.status(500).json({
      success: false,
      message: error.message || 'Google login failed',
      errors: [],
    });
  }
};

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

  if ((user.role === 'teacher' || user.role === 'student') && !user.isVerified) {
    throw ApiError.forbidden('Verify your email before completing your profile');
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
  const requestedEmail = String(req.body?.email ?? '')
    .trim()
    .toLowerCase();

  if (!requestedEmail) {
    throw ApiError.badRequest('Email is required');
  }

  const user = await User.findOne({ email: requestedEmail }).select('+passwordHash');
  const responseData = { sent: false, requestedEmail };

  if (canSendPasswordReset(user)) {
    if (user.email !== requestedEmail) {
      logger.error('[forgot-password] email mismatch', {
        requestedEmail,
        userEmail: user.email,
      });
      throw ApiError.internal('Could not process password reset request');
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.passwordResetExpires = new Date(Date.now() + 3600000);
    await user.save();

    try {
      const mailResult = await sendPasswordResetEmail({
        to: requestedEmail,
        name: user.name,
        token: resetToken,
        role: user.role,
        setPassword: !user.passwordHash,
      });
      responseData.sent = mailResult.sent;
      if (mailResult.deliveredTo) {
        responseData.deliveredTo = mailResult.deliveredTo;
      }
      if (mailResult.devResetToken) {
        responseData.devResetToken = mailResult.devResetToken;
      }
      if (!mailResult.sent) {
        responseData.emailError =
          mailResult.reason === 'not_configured'
            ? 'SMTP is not configured on this server'
            : 'Could not send password reset email';
        logger.warn('[forgot-password] email not sent', {
          requestedEmail,
          reason: mailResult.reason,
        });
      }
    } catch (err) {
      responseData.sent = false;
      responseData.emailError = err.message;
      if (env.NODE_ENV === 'development') {
        responseData.devResetToken = resetToken;
      }
      logger.error(`[forgot-password] send failed for ${requestedEmail}: ${err.message}`);
    }
  } else {
    logger.info('[forgot-password] no reset email sent', {
      requestedEmail,
      reason: user ? 'not_eligible' : 'not_found',
    });
  }

  ApiResponse.ok(
    res,
    responseData,
    responseData.sent && responseData.deliveredTo
      ? `Password reset instructions sent to ${responseData.deliveredTo}`
      : responseData.sent
        ? 'If an account exists for that email, password reset instructions have been sent'
        : 'Password reset email could not be sent. Try again later or contact support.',
  );
});

export const resetPassword = asyncHandler(async (req, res) => {
  const tokenHash = crypto.createHash('sha256').update(req.body.token).digest('hex');
  const user = await User.findOne({
    passwordResetToken: tokenHash,
    passwordResetExpires: { $gt: new Date() },
  });
  if (!user || !['student', 'teacher'].includes(user.role)) {
    throw ApiError.badRequest('Invalid or expired token');
  }
  user.passwordHash = await bcrypt.hash(req.body.password, env.BCRYPT_ROUNDS);
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  ApiResponse.ok(res, { message: 'Password reset successful' }, 'Password reset successful');
});

export const changePassword = asyncHandler(async (req, res) => {
  if (!['student', 'teacher'].includes(req.user.role)) {
    throw ApiError.forbidden('Password change is only available for student and tutor accounts');
  }

  const user = await User.findById(req.user.id).select('+passwordHash');
  if (!user) throw ApiError.notFound('User not found');
  if (!user.passwordHash) {
    throw ApiError.badRequest('This account uses Google sign-in and has no password to change');
  }

  const valid = await bcrypt.compare(req.body.currentPassword, user.passwordHash);
  if (!valid) throw ApiError.badRequest('Current password is incorrect');

  user.passwordHash = await bcrypt.hash(req.body.password, env.BCRYPT_ROUNDS);
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  ApiResponse.ok(res, { message: 'Password updated' }, 'Password updated successfully');
});
