import mongoose from 'mongoose';
import Course from '../models/Course.model.js';
import User from '../models/User.model.js';
import Progress from '../models/Progress.model.js';
import Certificate from '../models/Certificate.model.js';
import Review from '../models/Review.model.js';

export function countCourseLessons(course) {
  if (!course?.curriculum?.length) return Number(course?.lessons) || 0;
  return course.curriculum.reduce((sum, m) => sum + (m.lessons?.length || 0), 0);
}

export async function getCompletedLessonIds(enrollmentId) {
  const rows = await Progress.find({ enrollmentId, completed: true }).select('lessonId');
  return rows.map((r) => r.lessonId).filter(Boolean);
}

export async function computeEnrollmentProgress(enrollmentId, courseId) {
  const course = await Course.findById(courseId).select('curriculum lessons');
  const total = countCourseLessons(course);
  const completedLessonIds = await getCompletedLessonIds(enrollmentId);
  const completed = completedLessonIds.length;
  const progressPercent = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;
  return { total, completed, progressPercent, completedLessonIds, course };
}

export function certificateSerial() {
  return `TP-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 8999)}`;
}

export async function issueCertificateForEnrollment(enrollment) {
  const existing = await Certificate.findOne({ enrollmentId: enrollment._id });
  if (existing) return existing;

  const [user, course] = await Promise.all([
    User.findById(enrollment.userId).select('name'),
    Course.findById(enrollment.courseId).select('title instructorName instructorId'),
  ]);
  if (!user || !course) return null;

  return Certificate.create({
    userId: enrollment.userId,
    courseId: enrollment.courseId,
    enrollmentId: enrollment._id,
    certificateNumber: certificateSerial(),
    studentName: user.name,
    courseTitle: course.title,
    instructorName: course.instructorName || 'Instructor',
    issuedAt: new Date(),
  });
}

export async function recalcCourseRating(courseId) {
  const cid = typeof courseId === 'string' ? new mongoose.Types.ObjectId(courseId) : courseId;
  const agg = await Review.aggregate([
    { $match: { courseId: cid, targetType: 'course', status: 'published' } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  const avg = agg[0]?.avg ?? 0;
  const count = agg[0]?.count ?? 0;
  await Course.findByIdAndUpdate(courseId, {
    rating: Math.round(avg * 10) / 10,
    reviewCount: count,
  });
  return { rating: avg, count };
}

export async function recalcTutorRating(tutorId) {
  const tid = typeof tutorId === 'string' ? new mongoose.Types.ObjectId(tutorId) : tutorId;
  const agg = await Review.aggregate([
    { $match: { tutorId: tid, targetType: 'tutor', status: 'published' } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  const avg = agg[0]?.avg ?? 0;
  const count = agg[0]?.count ?? 0;
  await User.findByIdAndUpdate(tutorId, {
    'teacherProfile.rating': Math.round(avg * 10) / 10,
    'teacherProfile.reviewCount': count,
  });
  return { rating: avg, count };
}

export function shapeEnrollment(enrollment, course, completedLessonIds, certificate) {
  const c = course?.toObject ? course.toObject() : course;
  const u = enrollment.userId?.name != null ? enrollment.userId : null;
  return {
    id: enrollment._id?.toString(),
    courseId: enrollment.courseId?.toString?.() || enrollment.courseId,
    studentName: u?.name,
    studentEmail: u?.email,
    status: enrollment.status,
    enrolledAt: enrollment.enrolledAt,
    completedAt: enrollment.completedAt,
    progressPercent: enrollment.progressPercent ?? 0,
    completedLessonIds: completedLessonIds ?? [],
    course: c
      ? {
          id: c._id?.toString() || c.id,
          title: c.title,
          instructorName: c.instructorName,
          gradient: c.gradient,
          slug: c.slug,
        }
      : undefined,
    certificate: certificate
      ? {
          id: certificate._id?.toString(),
          serial: certificate.certificateNumber,
          studentName: certificate.studentName,
          courseTitle: certificate.courseTitle,
          instructor: certificate.instructorName,
          issuedAt: certificate.issuedAt,
        }
      : null,
  };
}
