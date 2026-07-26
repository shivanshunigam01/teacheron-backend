import User from '../models/User.model.js';
import Review from '../models/Review.model.js';
import Enrollment from '../models/Enrollment.model.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { mapTutorUser } from '../utils/tutorSearch.js';
import { refreshTopTenBadges } from '../services/gamification.service.js';

function formatCompact(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M+`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1).replace(/\.0$/, '')}K+`;
  return String(n);
}

let lastTopTenRefresh = 0;
const TOP_TEN_TTL_MS = 6 * 60 * 60 * 1000;

async function maybeRefreshTopTen() {
  const now = Date.now();
  if (now - lastTopTenRefresh < TOP_TEN_TTL_MS) return;
  lastTopTenRefresh = now;
  try {
    await refreshTopTenBadges();
  } catch {
    // non-fatal for public stats
  }
}

export const stats = asyncHandler(async (req, res) => {
  void maybeRefreshTopTen();

  const [tutorCount, studentCount, countries, ratingAgg, enrollmentCount] = await Promise.all([
    User.countDocuments({
      role: 'teacher',
      isActive: true,
      $or: [{ 'teacherProfile.verified': true }, { 'teacherProfile.profileCompleted': true }],
    }),
    User.countDocuments({ role: 'student', isActive: true }),
    User.distinct('teacherProfile.country', {
      role: 'teacher',
      isActive: true,
      'teacherProfile.country': { $nin: [null, ''] },
    }),
    Review.aggregate([
      { $match: { status: 'published' } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]),
    Enrollment.countDocuments({}),
  ]);

  const avgRating = ratingAgg[0]?.avg ? Math.round(ratingAgg[0].avg * 10) / 10 : 0;
  const reviewCount = ratingAgg[0]?.count ?? 0;
  const countryCount = (countries || []).filter(Boolean).length;
  const studentsHelped = Math.max(studentCount, enrollmentCount);

  ApiResponse.ok(
    res,
    {
      tutors: tutorCount,
      students: studentCount,
      studentsHelped,
      countries: countryCount,
      avgRating,
      reviewCount,
      display: {
        tutors: formatCompact(Math.max(tutorCount, 0)),
        students: formatCompact(Math.max(studentsHelped, 0)),
        rating: avgRating > 0 ? `${avgRating}★` : '—',
        countries: countryCount > 0 ? `${countryCount}+` : '—',
      },
    },
    'Platform stats',
  );
});

export const recommendations = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 6, 24);

  const tutors = await User.find({
    role: 'teacher',
    isActive: true,
    $or: [{ 'teacherProfile.verified': true }, { 'teacherProfile.rating': { $gte: 4 } }],
  })
    .sort({ 'teacherProfile.rating': -1, 'teacherProfile.reviewCount': -1 })
    .limit(limit);

  ApiResponse.ok(
    res,
    { items: tutors.map((u) => mapTutorUser(u)) },
    'Recommendations fetched',
  );
});

export const refreshGamification = asyncHandler(async (req, res) => {
  lastTopTenRefresh = Date.now();
  const result = await refreshTopTenBadges();
  ApiResponse.ok(res, result, 'Top 10% badges refreshed');
});
