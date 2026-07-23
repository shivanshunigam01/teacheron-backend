import bcrypt from 'bcrypt';
import crypto from 'crypto';
import User from '../models/User.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
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

const SELF_SERVE_ROLES = ['student', 'teacher', 'parent'];

const issue = async (u) => tokenService.issueTokens(u);

/** Email OTP required for local email accounts; WhatsApp-only / already-verified skip. */
const needsEmailVerification = (user) =>
  SELF_SERVE_ROLES.includes(user.role) &&
  Boolean(user.email) &&
  user.provider !== 'whatsapp' &&
  !user.isVerified;

const withHasPassword = async (user) => {
  const json = await withStaffRole(user);
  if (Object.prototype.hasOwnProperty.call(user, 'passwordHash') || user.passwordHash !== undefined) {
    json.hasPassword = Boolean(user.passwordHash);
    return json;
  }
  const row = await User.findById(userId(user)).select('+passwordHash').lean();
  json.hasPassword = Boolean(row?.passwordHash);
  return json;
};

const authPayload = async (user, extra = {}) => ({
  user: await withHasPassword(user),
  ...(await issue(user)),
  profileComplete: user.profileComplete,
  requiresEmailVerification: needsEmailVerification(user),
  ...extra,
});

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!SELF_SERVE_ROLES.includes(role)) {
    throw ApiError.badRequest('Only student, tutor, or parent accounts can self-register');
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
            onlineTeaching: false,
            homeTuition: false,
            groupClasses: false,
            assignmentHelp: false,
            profileCompleted: false,
            subjects: [],
            teachingSubjects: [],
            education: [],
            experienceEntries: [],
          }
        : undefined,
    studentProfile: role === 'student' ? {} : undefined,
    parentProfile: role === 'parent' ? { children: [] } : undefined,
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
  if (!SELF_SERVE_ROLES.includes(user.role)) {
    throw ApiError.badRequest('Email verification is only required for student, tutor, and parent accounts');
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
      : refreshed.role === 'parent'
        ? 'Email verified — complete your parent profile to continue'
        : extra.welcomeEmailSent
          ? 'Email verified — welcome email sent with course highlights'
          : 'Email verified — you can complete your profile and explore courses';

  ApiResponse.ok(res, await authPayload(refreshed, extra), message);
});

export const resendVerification = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw ApiError.notFound('User not found');
  if (!SELF_SERVE_ROLES.includes(user.role)) {
    throw ApiError.badRequest('Email verification is only required for student, tutor, and parent accounts');
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
  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash');

  if (!user) {
    const err = ApiError.unauthorized(
      'No account found with this email address. Check the spelling or sign up for a new account.',
    );
    err.errors = [{ field: 'email', message: 'ACCOUNT_NOT_REGISTERED' }];
    throw err;
  }
  if (!user.passwordHash) {
    const via =
      user.provider === 'whatsapp'
        ? 'WhatsApp'
        : user.provider === 'google'
          ? 'Google'
          : 'your social sign-in provider';
    throw ApiError.unauthorized(
      `This account has no password. Continue with ${via}, or use Forgot password to set one if you have an email on the account.`,
    );
  }
  if (!(await bcrypt.compare(password, user.passwordHash))) {
    throw ApiError.unauthorized('Incorrect password. Please try again or use Forgot password.');
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

    console.log('GOOGLE_CLIENT_ID:', env.googleClientId || '(not set)');
    console.log('Credential Exists:', !!credential);
    console.log('Credential Length:', credential?.length);

    if (!env.googleClientId) {
      return res.status(500).json({
        success: false,
        message: 'Google sign-in is not configured. Set GOOGLE_CLIENT_ID in backend .env and restart the server',
        errors: [],
      });
    }

    const googleClient = new OAuth2Client(env.googleClientId);

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: env.googleClientId,
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
  const refreshToken = req.body.refreshToken;
  let payload;
  try {
    payload = tokenService.verifyRefresh(refreshToken);
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) throw ApiError.unauthorized('Invalid or expired refresh token');

  const stored = user.refreshTokens || [];
  // Legacy sessions (pre-revocation) have an empty list — allow once, then rotate into storage.
  if (stored.length > 0 && !tokenService.isStoredRefreshTokenValid(user, refreshToken)) {
    throw ApiError.unauthorized('Refresh token has been revoked');
  }

  const tokens = await tokenService.rotateRefreshToken(user, refreshToken);
  ApiResponse.ok(res, tokens, 'Token refreshed');
});

export const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.body?.refreshToken;
  await tokenService.revokeRefreshToken(req.user.id, refreshToken);
  res.status(204).send();
});

export const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw ApiError.notFound('User not found');
  ApiResponse.ok(res, await withHasPassword(user), 'Profile fetched');
});

export const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw ApiError.notFound('User not found');

  if (SELF_SERVE_ROLES.includes(user.role) && Boolean(user.email) && user.provider !== 'whatsapp' && !user.isVerified) {
    throw ApiError.forbidden('Verify your email before completing your profile');
  }

  const {
    name,
    phone,
    phoneCountryCode,
    avatarUrl,
    theme,
    locale,
    teacherProfile,
    studentProfile,
    parentProfile,
  } = req.body;

  if (name) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (phoneCountryCode !== undefined) user.phoneCountryCode = phoneCountryCode;
  if (avatarUrl !== undefined) user.avatarUrl = avatarUrl || undefined;
  if (theme) user.theme = theme;
  if (locale) user.locale = locale;

  if (user.role === 'teacher' && teacherProfile) {
    const { upsertTeacherProfile } = await import('../services/teacher.service.js');
    const { user: updated, welcomeEmailSent } = await upsertTeacherProfile(user, {
      name,
      phone,
      phoneCountryCode,
      avatarUrl,
      teacherProfile,
    });
    const json = await withHasPassword(updated);
    return ApiResponse.ok(
      res,
      { ...json, welcomeEmailSent, requiresEmailVerification: false },
      welcomeEmailSent ? 'Profile complete — welcome email sent' : 'Profile updated',
    );
  }

  if (user.role === 'student' && studentProfile) {
    user.studentProfile = {
      ...(user.studentProfile?.toObject?.() || user.studentProfile || {}),
      ...studentProfile,
    };
  }

  if (user.role === 'parent' && parentProfile) {
    const prev = user.parentProfile?.toObject?.() || user.parentProfile || {};
    user.parentProfile = {
      ...prev,
      ...parentProfile,
      children:
        parentProfile.children !== undefined
          ? parentProfile.children
          : prev.children || [],
    };
  }

  const wasComplete = user.profileComplete;
  user.profileComplete = computeProfileComplete(user);
  if (user.role === 'teacher' && user.teacherProfile) {
    user.teacherProfile.profileCompleted = user.profileComplete;
  }
  await user.save();

  let welcomeEmailSent = false;
  if (user.role === 'teacher' && user.profileComplete && !wasComplete) {
    const welcome = await sendTeacherWelcomeIfReady(user);
    welcomeEmailSent = Boolean(welcome.sent);
  }

  const json = await withHasPassword(user);
  ApiResponse.ok(
    res,
    { ...json, welcomeEmailSent, requiresEmailVerification: false },
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
  if (!user || !SELF_SERVE_ROLES.includes(user.role)) {
    throw ApiError.badRequest('Invalid or expired token');
  }
  user.passwordHash = await bcrypt.hash(req.body.password, env.BCRYPT_ROUNDS);
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  // Invalidate existing refresh sessions after password reset
  user.refreshTokens = [];
  await user.save();
  ApiResponse.ok(res, { message: 'Password reset successful' }, 'Password reset successful');
});

export const changePassword = asyncHandler(async (req, res) => {
  if (!SELF_SERVE_ROLES.includes(req.user.role)) {
    throw ApiError.forbidden('Password change is only available for student, tutor, and parent accounts');
  }

  const user = await User.findById(req.user.id).select('+passwordHash');
  if (!user) throw ApiError.notFound('User not found');
  if (!user.passwordHash) {
    throw ApiError.badRequest(
      'This account has no password yet. Use Forgot password to set one, or continue with Google / WhatsApp.',
    );
  }

  const valid = await bcrypt.compare(req.body.currentPassword, user.passwordHash);
  if (!valid) throw ApiError.badRequest('Current password is incorrect');

  user.passwordHash = await bcrypt.hash(req.body.password, env.BCRYPT_ROUNDS);
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.refreshTokens = [];
  await user.save();

  ApiResponse.ok(res, { message: 'Password updated' }, 'Password updated successfully');
});
