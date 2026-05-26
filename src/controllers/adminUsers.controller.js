import bcrypt from 'bcrypt';
import User from '../models/User.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getPagination, paginationMeta } from '../utils/pagination.js';
import { toJSON, toJSONList } from '../utils/serialize.js';
import env from '../config/env.js';
import { computeProfileComplete, initialsFromName } from '../utils/profileComplete.js';

export const listUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip, sort } = getPagination(req.query);
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.status === 'active') filter.isActive = true;
  if (req.query.status === 'inactive') filter.isActive = false;
  if (req.query.q) {
    filter.$or = [
      { name: new RegExp(req.query.q, 'i') },
      { email: new RegExp(req.query.q, 'i') },
    ];
  }

  const [items, total] = await Promise.all([
    User.find(filter).sort(sort).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  ApiResponse.ok(
    res,
    { items: toJSONList(items), pagination: paginationMeta(total, page, limit) },
    'Users fetched',
  );
});

export const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, phone, isActive, isVerified, teacherProfile, studentProfile } =
    req.body;

  if (await User.findOne({ email: email.toLowerCase() })) {
    throw ApiError.conflict('Email already exists');
  }

  const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    passwordHash,
    role,
    phone,
    isActive: isActive !== false,
    isVerified: isVerified === true,
    teacherProfile:
      role === 'teacher'
        ? {
            initials: initialsFromName(name),
            gradient: 'from-blue-500 to-purple-500',
            verified: false,
            online: true,
            subjects: [],
            ...teacherProfile,
          }
        : undefined,
    studentProfile: role === 'student' ? studentProfile : undefined,
  });

  user.profileComplete = computeProfileComplete(user);
  await user.save();

  ApiResponse.created(res, toJSON(user), 'User created');
});

export const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');

  const { name, email, phone, role, isActive, isVerified, password, teacherProfile, studentProfile } =
    req.body;

  if (email && email.toLowerCase() !== user.email) {
    const exists = await User.findOne({ email: email.toLowerCase(), _id: { $ne: user._id } });
    if (exists) throw ApiError.conflict('Email already in use');
    user.email = email.toLowerCase();
  }

  if (name) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (role) user.role = role;
  if (typeof isActive === 'boolean') user.isActive = isActive;
  if (typeof isVerified === 'boolean') user.isVerified = isVerified;
  if (password) user.passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);

  if (teacherProfile && (user.role === 'teacher' || role === 'teacher')) {
    user.teacherProfile = {
      ...(user.teacherProfile?.toObject?.() || user.teacherProfile || {}),
      ...teacherProfile,
    };
  }
  if (studentProfile && (user.role === 'student' || role === 'student')) {
    user.studentProfile = {
      ...(user.studentProfile?.toObject?.() || user.studentProfile || {}),
      ...studentProfile,
    };
  }

  user.profileComplete = computeProfileComplete(user);
  await user.save();

  ApiResponse.ok(res, toJSON(user), 'User updated');
});

export const deleteUser = asyncHandler(async (req, res) => {
  if (req.params.id === req.user.id) {
    throw ApiError.badRequest('You cannot delete your own admin account');
  }
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) throw ApiError.notFound('User not found');
  ApiResponse.ok(res, {}, 'User deleted');
});
