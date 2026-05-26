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
import { computeProfileComplete, initialsFromName } from '../utils/profileComplete.js';

const userId = (u) => (u._id ? String(u._id) : u.id);

const issue = (u) => ({
  accessToken: tokenService.signAccess(userId(u), u.role, u.email),
  refreshToken: tokenService.signRefresh(userId(u)),
});

const authPayload = (user) => ({
  user: toJSON(user),
  ...issue(user),
  profileComplete: user.profileComplete,
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
    isVerified: false,
    profileComplete: false,
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
    await sendMail({ to: email, subject: 'Welcome to TeacherPoint', html: `<h2>Welcome ${name}</h2>` });
  } catch {
    /* SMTP optional in dev */
  }

  ApiResponse.created(res, authPayload(user), 'Registered successfully');
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

  ApiResponse.ok(res, authPayload(user), 'Login successful');
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
  ApiResponse.ok(res, toJSON(user), 'Profile fetched');
});

export const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw ApiError.notFound('User not found');

  const { name, phone, avatarUrl, theme, locale, teacherProfile, studentProfile } = req.body;

  if (name) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (avatarUrl !== undefined) user.avatarUrl = avatarUrl || undefined;
  if (theme) user.theme = theme;
  if (locale) user.locale = locale;

  if (user.role === 'teacher' && teacherProfile) {
    user.teacherProfile = {
      ...(user.teacherProfile?.toObject?.() || user.teacherProfile || {}),
      ...teacherProfile,
      initials: user.teacherProfile?.initials || initialsFromName(user.name),
    };
  }

  if (user.role === 'student' && studentProfile) {
    user.studentProfile = {
      ...(user.studentProfile?.toObject?.() || user.studentProfile || {}),
      ...studentProfile,
    };
  }

  user.profileComplete = computeProfileComplete(user);
  await user.save();

  ApiResponse.ok(res, toJSON(user), 'Profile updated');
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
