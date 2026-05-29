import mongoose from 'mongoose';
import Review from '../models/Review.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getPagination, paginationMeta } from '../utils/pagination.js';
import { toJSON } from '../utils/serialize.js';
import { recalcCourseRating, recalcTutorRating } from '../services/learning.service.js';

function shapeReview(doc) {
  const r = toJSON(doc);
  return {
    id: r.id,
    targetType: r.targetType,
    courseId: r.courseId?.toString?.() || r.courseId,
    tutorId: r.tutorId?.toString?.() || r.tutorId,
    studentName: r.authorName || 'Student',
    rating: r.rating,
    comment: r.text,
    createdAt: r.createdAt,
  };
}

export const list = asyncHandler(async (req, res) => {
  const { page, limit, skip, sort } = getPagination(req.query);
  const filter = { status: req.query.status || 'published' };
  if (req.query.courseId) filter.courseId = req.query.courseId;
  if (req.query.tutorId) filter.tutorId = req.query.tutorId;
  if (req.query.targetType) filter.targetType = req.query.targetType;

  const [items, total] = await Promise.all([
    Review.find(filter).sort(sort).skip(skip).limit(limit),
    Review.countDocuments(filter),
  ]);
  ApiResponse.ok(
    res,
    { items: items.map(shapeReview), pagination: paginationMeta(total, page, limit) },
    'Reviews fetched',
  );
});

export const summary = asyncHandler(async (req, res) => {
  const filter = { status: 'published' };
  if (req.query.courseId) {
    filter.courseId = req.query.courseId;
    filter.targetType = 'course';
  } else if (req.query.tutorId) {
    filter.tutorId = req.query.tutorId;
    filter.targetType = 'tutor';
  } else {
    throw ApiError.badRequest('courseId or tutorId required');
  }

  if (filter.courseId && typeof filter.courseId === 'string') {
    filter.courseId = new mongoose.Types.ObjectId(filter.courseId);
  }
  if (filter.tutorId && typeof filter.tutorId === 'string') {
    filter.tutorId = new mongoose.Types.ObjectId(filter.tutorId);
  }
  const agg = await Review.aggregate([
    { $match: filter },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  const rating = agg[0]?.avg ? Math.round(agg[0].avg * 10) / 10 : 0;
  const count = agg[0]?.count ?? 0;
  ApiResponse.ok(res, { rating, count }, 'Review summary');
});

export const create = asyncHandler(async (req, res) => {
  const { rating, text, courseId, tutorId, targetType } = req.body;
  if (!rating || rating < 1 || rating > 5) throw ApiError.badRequest('rating 1–5 required');
  if (!text?.trim()) throw ApiError.badRequest('Review text is required');

  let resolvedTarget = targetType;
  if (!resolvedTarget) {
    if (courseId) resolvedTarget = 'course';
    else if (tutorId) resolvedTarget = 'tutor';
    else throw ApiError.badRequest('courseId or tutorId required');
  }

  if (resolvedTarget === 'course' && !courseId) throw ApiError.badRequest('courseId required');
  if (resolvedTarget === 'tutor' && !tutorId) throw ApiError.badRequest('tutorId required');

  const existing = await Review.findOne({
    authorId: req.user.id,
    targetType: resolvedTarget,
    ...(courseId ? { courseId } : {}),
    ...(tutorId ? { tutorId } : {}),
  });
  if (existing) throw ApiError.badRequest('You already reviewed this item');

  const item = await Review.create({
    targetType: resolvedTarget,
    courseId: courseId || undefined,
    tutorId: tutorId || undefined,
    authorId: req.user.id,
    authorName: req.user.name,
    rating,
    text: text.trim().slice(0, 2000),
    status: 'published',
  });

  if (resolvedTarget === 'course') await recalcCourseRating(courseId);
  if (resolvedTarget === 'tutor') await recalcTutorRating(tutorId);

  ApiResponse.created(res, shapeReview(item), 'Review submitted');
});

export const getById = asyncHandler(async (req, res) => {
  const item = await Review.findById(req.params.id);
  if (!item) throw ApiError.notFound();
  ApiResponse.ok(res, shapeReview(item), 'Review fetched');
});

export const remove = asyncHandler(async (req, res) => {
  const item = await Review.findById(req.params.id);
  if (!item) throw ApiError.notFound();
  if (item.authorId.toString() !== req.user.id && req.user.role !== 'admin') {
    throw ApiError.forbidden();
  }
  const { courseId, tutorId, targetType } = item;
  await item.deleteOne();
  if (targetType === 'course' && courseId) await recalcCourseRating(courseId);
  if (targetType === 'tutor' && tutorId) await recalcTutorRating(tutorId);
  ApiResponse.ok(res, {}, 'Review deleted');
});
