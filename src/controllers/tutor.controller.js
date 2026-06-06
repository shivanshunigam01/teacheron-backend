import User from '../models/User.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getPagination, paginationMeta } from '../utils/pagination.js';
import {
  buildTutorFilter,
  buildTutorSort,
  collectCitiesWithTutors,
  collectCountriesWithTutors,
  collectLocationFacets,
  mapTutorUser,
} from '../utils/tutorSearch.js';

export const listTutors = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 24));
  const skip = (page - 1) * limit;
  const filter = buildTutorFilter(req.query, { publicOnly: true });
  const sort = buildTutorSort(req.query.sortBy);
  const [items, total] = await Promise.all([
    User.find(filter).sort(sort).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);
  ApiResponse.ok(
    res,
    { items: items.map((u) => mapTutorUser(u)), pagination: paginationMeta(total, page, limit) },
    'Tutors fetched',
  );
});

export const getTutorById = asyncHandler(async (req, res) => {
  const u = await User.findOne({
    _id: req.params.id,
    role: 'teacher',
    isActive: { $ne: false },
    $or: [{ 'teacherProfile.profileCompleted': true }, { profileComplete: true }],
  });
  if (!u) throw ApiError.notFound('Tutor not found');
  ApiResponse.ok(res, mapTutorUser(u, { detailed: true }), 'Tutor fetched');
});

export const tutorFacets = asyncHandler(async (req, res) => {
  const teachers = await User.find({
    role: 'teacher',
    isActive: { $ne: false },
    $or: [{ 'teacherProfile.profileCompleted': true }, { profileComplete: true }],
  }).select(
    'teacherProfile.subjects teacherProfile.location teacherProfile.languages teacherProfile.online teacherProfile.onlineTeaching teacherProfile.country teacherProfile.city',
  );
  const subjects = new Set();
  const languages = new Set();
  for (const t of teachers) {
    for (const s of t.teacherProfile?.subjects || []) if (s) subjects.add(s);
    for (const l of t.teacherProfile?.languages || []) if (l) languages.add(l);
  }
  ApiResponse.ok(
    res,
    {
      subjects: [...subjects].sort((a, b) => a.localeCompare(b)),
      locations: collectLocationFacets(teachers),
      countriesWithTutors: collectCountriesWithTutors(teachers),
      citiesWithTutors: collectCitiesWithTutors(teachers),
      languages: [...languages].sort((a, b) => a.localeCompare(b)),
      totalTutors: teachers.length,
    },
    'Tutor facets fetched',
  );
});

export const listTeachersAdmin = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = { role: 'teacher' };
  const q = (req.query.q || '').trim();
  if (q) {
    filter.$or = [
      { name: { $regex: q, $options: 'i' } },
      { email: { $regex: q, $options: 'i' } },
    ];
  }
  if (req.query.status === 'active') filter.isActive = true;
  if (req.query.status === 'inactive') filter.isActive = false;
  if (req.query.profileCompleted === 'true') filter.profileComplete = true;
  if (req.query.profileCompleted === 'false') filter.profileComplete = false;

  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  ApiResponse.ok(
    res,
    {
      items: items.map((u) => ({
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        isActive: u.isActive !== false,
        isVerified: u.isVerified,
        profileComplete: u.profileComplete,
        profileCompleted: u.teacherProfile?.profileCompleted || u.profileComplete,
        speciality: u.teacherProfile?.speciality || '',
        country: u.teacherProfile?.country || '',
        city: u.teacherProfile?.city || '',
        verified: u.teacherProfile?.verified || false,
        rating: u.teacherProfile?.rating || 0,
        reviewCount: u.teacherProfile?.reviewCount || 0,
        createdAt: u.createdAt,
      })),
      pagination: paginationMeta(total, page, limit),
    },
    'Teachers fetched',
  );
});

export const updateTeacherStatus = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, role: 'teacher' });
  if (!user) throw ApiError.notFound('Teacher not found');

  const { isActive, verified, topTen, profileCompleted } = req.body;
  if (isActive !== undefined) user.isActive = isActive;
  if (verified !== undefined) {
    user.teacherProfile = user.teacherProfile || {};
    user.teacherProfile.verified = verified;
  }
  if (topTen !== undefined) {
    user.teacherProfile = user.teacherProfile || {};
    user.teacherProfile.topTen = topTen;
  }
  if (profileCompleted !== undefined) {
    user.profileComplete = profileCompleted;
    user.teacherProfile = user.teacherProfile || {};
    user.teacherProfile.profileCompleted = profileCompleted;
  }

  await user.save();
  ApiResponse.ok(
    res,
    {
      id: user._id.toString(),
      isActive: user.isActive,
      verified: user.teacherProfile?.verified || false,
      topTen: user.teacherProfile?.topTen || false,
    },
    'Teacher status updated',
  );
});
