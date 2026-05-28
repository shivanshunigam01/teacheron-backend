import Course from '../models/Course.model.js';
import logger from '../config/logger.js';
import { sendMail } from './email.service.js';
import { buildWelcomeEmail } from '../templates/email/welcomeEmail.js';

const WELCOME_COURSE_LIMIT = 6;

/**
 * @returns {Promise<Array<object>>}
 */
export async function fetchPublishedCoursesForWelcome() {
  try {
    const rows = await Course.find({ status: 'published' })
      .sort({ students: -1, rating: -1, createdAt: -1 })
      .limit(WELCOME_COURSE_LIMIT)
      .select('title slug category instructorName price level duration students rating')
      .lean();

    return rows.map((c) => ({
      title: c.title,
      slug: c.slug,
      category: c.category,
      instructorName: c.instructorName,
      price: c.price,
      level: c.level,
      duration: c.duration,
      students: c.students,
      rating: c.rating,
    }));
  } catch (err) {
    logger.warn(`[welcome-email] Could not load courses: ${err.message}`);
    return [];
  }
}

/**
 * @param {{ name: string; email: string; role: 'student' | 'teacher' }} params
 * @returns {Promise<{ sent: boolean; stub?: boolean; courseCount: number; error?: string }>}
 */
export async function sendWelcomeEmail({ name, email, role }) {
  const courses = await fetchPublishedCoursesForWelcome();
  const welcome = buildWelcomeEmail({ name, email, role, courses });

  const result = await sendMail({
    to: email,
    subject: welcome.subject,
    html: welcome.html,
    text: welcome.text,
  });

  const stub = Boolean(result?.stub);
  return {
    sent: !stub,
    stub,
    courseCount: courses.length,
    reason: result?.reason,
  };
}
