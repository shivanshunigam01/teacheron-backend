import User from '../models/User.model.js';
import { ApiError } from '../utils/ApiError.js';
import { computeTeacherProfileProgress } from '../utils/profileComplete.js';
import { toJSON } from '../utils/serialize.js';
import { applyTeacherProfileToUser, normalizeTeacherProfilePayload } from '../utils/teacherProfile.js';
import { sendTeacherWelcomeIfReady } from './emailVerification.service.js';

function normalizePayload(body = {}) {
  const teacherProfile = body.teacherProfile ? { ...body.teacherProfile } : {};
  if (teacherProfile.experienceEntries?.length && !teacherProfile.experiences?.length) {
    teacherProfile.experiences = teacherProfile.experienceEntries;
  }
  return {
    ...body,
    teacherProfile: teacherProfile && Object.keys(teacherProfile).length
      ? normalizeTeacherProfilePayload(teacherProfile)
      : undefined,
  };
}

function shapeResponse(user, extra = {}) {
  return {
    ...toJSON(user),
    progress: computeTeacherProfileProgress(user),
    ...extra,
  };
}

export async function getTeacherProfile(userId) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');
  if (user.role !== 'teacher') throw ApiError.forbidden('Teacher account required');
  return shapeResponse(user);
}

export async function upsertTeacherProfile(userId, body) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');
  if (user.role !== 'teacher') throw ApiError.forbidden('Teacher account required');
  if (!user.isVerified) {
    throw ApiError.forbidden('Verify your email before completing your profile');
  }

  const payload = normalizePayload(body);
  const { name, phone, phoneCountryCode, avatarUrl, teacherProfile } = payload;

  if (name) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (phoneCountryCode !== undefined) user.phoneCountryCode = phoneCountryCode;

  const wasComplete = user.profileComplete;
  applyTeacherProfileToUser(user, teacherProfile || {}, { avatarUrl });

  await user.save();

  let welcomeEmailSent = false;
  if (user.profileComplete && !wasComplete) {
    const welcome = await sendTeacherWelcomeIfReady(user);
    welcomeEmailSent = Boolean(welcome.sent);
  }

  return shapeResponse(user, { welcomeEmailSent });
}

export async function listAdminTeachers(query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;
  const filter = { role: 'teacher' };

  if (query.profileCompleted === 'true') filter.profileComplete = true;
  if (query.profileCompleted === 'false') filter.profileComplete = false;
  if (query.isActive === 'true') filter.isActive = true;
  if (query.isActive === 'false') filter.isActive = false;
  if (query.status === 'active') filter.isActive = true;
  if (query.status === 'inactive') filter.isActive = false;

  if (query.q?.trim()) {
    const re = new RegExp(query.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: re }, { email: re }, { 'teacherProfile.speciality': re }];
  }

  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  return {
    items: items.map((u) => shapeResponse(u)),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
  };
}

export async function patchAdminTeacherStatus(teacherId, body) {
  const user = await User.findOne({ _id: teacherId, role: 'teacher' });
  if (!user) throw ApiError.notFound('Teacher not found');

  if (body.isActive != null) user.isActive = body.isActive;
  if (body.verified != null) {
    user.teacherProfile = user.teacherProfile || {};
    user.teacherProfile.verified = body.verified;
  }
  if (body.profileCompleted != null) {
    user.profileComplete = body.profileCompleted;
    user.teacherProfile = user.teacherProfile || {};
    user.teacherProfile.profileCompleted = body.profileCompleted;
  }

  await user.save();
  return shapeResponse(user);
}
