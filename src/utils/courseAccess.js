import Course from '../models/Course.model.js';
import { ApiError } from '../utils/ApiError.js';

/** Load course; teachers may only access their own unless admin. */
export async function loadCourseForMutation(req, courseId) {
  const course = await Course.findById(courseId);
  if (!course) throw ApiError.notFound('Course not found');
  if (req.user.role === 'admin') return course;
  if (String(course.instructorId) !== String(req.user.id)) {
    throw ApiError.forbidden('You can only modify your own courses');
  }
  return course;
}
