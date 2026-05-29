import Enrollment from '../models/Enrollment.model.js';
import Progress from '../models/Progress.model.js';
import Certificate from '../models/Certificate.model.js';
import Course from '../models/Course.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { toJSON } from '../utils/serialize.js';
import {
  computeEnrollmentProgress,
  issueCertificateForEnrollment,
  shapeEnrollment,
} from '../services/learning.service.js';

async function enrichEnrollment(enrollment) {
  const course =
    enrollment.courseId?.title != null
      ? enrollment.courseId
      : await Course.findById(enrollment.courseId);
  const { completedLessonIds } = await computeEnrollmentProgress(
    enrollment._id,
    enrollment.courseId?._id || enrollment.courseId,
  );
  const certificate = await Certificate.findOne({ enrollmentId: enrollment._id });
  return shapeEnrollment(enrollment, course, completedLessonIds, certificate);
}

export const enroll = asyncHandler(async (req, res) => {
  const courseId = req.body.courseId;
  if (!courseId) throw ApiError.badRequest('courseId is required');

  const course = await Course.findById(courseId);
  if (!course || course.status !== 'published') throw ApiError.notFound('Course not found');

  let item = await Enrollment.findOne({ userId: req.user.id, courseId });
  if (item) {
    const shaped = await enrichEnrollment(item);
    return ApiResponse.ok(res, shaped, 'Already enrolled');
  }

  item = await Enrollment.create({ userId: req.user.id, courseId });
  await Course.findByIdAndUpdate(courseId, { $inc: { students: 1 } });

  const shaped = await enrichEnrollment(item);
  ApiResponse.created(res, shaped, 'Enrolled successfully');
});

export const mine = asyncHandler(async (req, res) => {
  const filter = { userId: req.user.id };
  if (req.query.status) filter.status = req.query.status;

  const items = await Enrollment.find(filter).sort({ enrolledAt: -1 });
  const shaped = await Promise.all(items.map((e) => enrichEnrollment(e)));
  ApiResponse.ok(res, { items: shaped }, 'Enrollments fetched');
});

export const byCourse = asyncHandler(async (req, res) => {
  const item = await Enrollment.findOne({
    userId: req.user.id,
    courseId: req.params.courseId,
  });
  if (!item) return ApiResponse.ok(res, null, 'Not enrolled');
  const shaped = await enrichEnrollment(item);
  ApiResponse.ok(res, shaped, 'Enrollment fetched');
});

export const getById = asyncHandler(async (req, res) => {
  const item = await Enrollment.findById(req.params.id);
  if (!item) throw ApiError.notFound();
  if (item.userId.toString() !== req.user.id && req.user.role !== 'admin') {
    throw ApiError.forbidden();
  }
  const shaped = await enrichEnrollment(item);
  ApiResponse.ok(res, shaped, 'Enrollment fetched');
});

export const progress = asyncHandler(async (req, res) => {
  const enr = await Enrollment.findById(req.params.id);
  if (!enr) throw ApiError.notFound();
  if (enr.userId.toString() !== req.user.id) throw ApiError.forbidden();

  const { lessonId, moduleId, completed = true } = req.body;
  if (!lessonId) throw ApiError.badRequest('lessonId is required');

  if (completed) {
    await Progress.findOneAndUpdate(
      { enrollmentId: enr._id, lessonId },
      {
        enrollmentId: enr._id,
        userId: req.user.id,
        courseId: enr.courseId,
        lessonId,
        moduleId,
        completed: true,
      },
      { upsert: true, new: true },
    );
  } else {
    await Progress.deleteOne({ enrollmentId: enr._id, lessonId });
  }

  const { progressPercent, completedLessonIds, total } = await computeEnrollmentProgress(
    enr._id,
    enr.courseId,
  );

  enr.progressPercent = progressPercent;
  if (progressPercent >= 100 && total > 0) {
    enr.status = 'completed';
    enr.completedAt = enr.completedAt || new Date();
    await issueCertificateForEnrollment(enr);
  } else if (enr.status === 'completed' && progressPercent < 100) {
    enr.status = 'active';
    enr.completedAt = undefined;
  }
  await enr.save();

  const certificate = await Certificate.findOne({ enrollmentId: enr._id });
  const course = await Course.findById(enr.courseId);
  ApiResponse.ok(
    res,
    shapeEnrollment(enr, course, completedLessonIds, certificate),
    'Progress updated',
  );
});

/** Teacher/admin: enrollments for a course */
export const forCourse = asyncHandler(async (req, res) => {
  const items = await Enrollment.find({ courseId: req.params.courseId })
    .populate('userId', 'name email')
    .sort({ enrolledAt: -1 });
  const shaped = await Promise.all(items.map((e) => enrichEnrollment(e)));
  ApiResponse.ok(res, { items: shaped }, 'Course enrollments fetched');
});
