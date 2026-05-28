import Course from '../models/Course.model.js';
import { sendMail } from './email.service.js';
import { buildWelcomeEmail } from '../templates/email/welcomeEmail.js';

const WELCOME_COURSE_LIMIT = 6;

/**
 * @returns {Promise<Array<{
 *   title: string;
 *   slug?: string;
 *   category?: string;
 *   instructorName?: string;
 *   price?: number;
 *   level?: string;
 *   duration?: string;
 *   students?: number;
 *   rating?: number;
 * }>>}
 */
export async function fetchPublishedCoursesForWelcome() {
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
}

/**
 * @param {{ name: string; email: string; role: 'student' | 'teacher' }} params
 * @returns {Promise<{ sent: boolean; stub?: boolean; courseCount: number }>}
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
  return { sent: !stub, stub, courseCount: courses.length };
}
