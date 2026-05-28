import env from '../../config/env.js';
import { escapeHtml } from './escapeHtml.js';
import { wrapEmail, emailButton, featureList } from './baseLayout.js';

const PRIMARY = '#4f46e5';
const BORDER = '#e2e8f0';
const MUTED = '#64748b';

const copy = {
  student: {
    subject: 'Welcome to TeachersPoints — courses picked for you',
    preheader: 'Your account is ready. Explore popular courses and start learning today.',
    headline: 'Welcome aboard, learner!',
    intro:
      'Thanks for joining TeachersPoints. Your student account is active — browse expert-led courses, connect with tutors, and start learning at your own pace.',
    coursesHeading: 'Popular courses you can start today',
    coursesEmpty:
      'New courses are added regularly. Visit our catalog to discover subjects that match your goals.',
    features: [
      'Enroll in live and self-paced courses',
      'Track progress and earn certificates',
      'Message tutors and join the Student Exchange',
      'Complete your profile for better recommendations',
    ],
    cta: 'Browse all courses',
    coursesCta: 'View course catalog',
    profileCta: 'Complete your profile',
    roleLabel: 'student',
  },
  teacher: {
    subject: 'Welcome to TeachersPoints — grow your teaching practice',
    preheader: 'Your tutor account is live. See what learners are studying on the platform.',
    headline: 'Welcome aboard, tutor!',
    intro:
      'Thanks for joining TeachersPoints. Your tutor account is ready — build your profile, publish courses, and connect with students who need your expertise.',
    coursesHeading: 'Featured courses learners are taking now',
    coursesEmpty:
      'Explore the course catalog to see what students enroll in — then create your own offerings.',
    features: [
      'Publish courses and manage enrollments',
      'Set subjects, rates, and availability',
      'Reach students through our global marketplace',
      'Get verified to build trust with new learners',
    ],
    cta: 'Explore the catalog',
    coursesCta: 'View all courses',
    profileCta: 'Set up your tutor profile',
    roleLabel: 'tutor',
  },
};

function formatPrice(price) {
  if (price == null || Number.isNaN(Number(price))) return 'Free to explore';
  const n = Number(price);
  if (n === 0) return 'Free';
  return `$${n % 1 === 0 ? n : n.toFixed(2)}`;
}

/**
 * @param {Array<{ title: string; slug?: string; category?: string; instructorName?: string; price?: number; level?: string; duration?: string; students?: number; rating?: number }>} courses
 * @param {string} coursesUrl
 * @param {string} heading
 */
function courseListSection(courses, coursesUrl, heading) {
  if (!courses?.length) return '';

  const rows = courses
    .map((c) => {
      const href = c.slug
        ? `${coursesUrl.replace(/\/$/, '')}/${encodeURIComponent(c.slug)}`
        : coursesUrl;
      const meta = [
        c.category,
        c.level,
        c.instructorName ? `with ${c.instructorName}` : null,
        c.duration,
        c.rating ? `★ ${Number(c.rating).toFixed(1)}` : null,
        c.students ? `${c.students.toLocaleString()} students` : null,
      ]
        .filter(Boolean)
        .join(' · ');

      return `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid ${BORDER};">
          <a href="${escapeHtml(href)}" style="font-size:16px;font-weight:600;color:${PRIMARY};text-decoration:none;">
            ${escapeHtml(c.title)}
          </a>
          <p style="margin:4px 0 0;font-size:13px;line-height:1.5;color:${MUTED};">${escapeHtml(meta)}</p>
          <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#0f172a;">${escapeHtml(formatPrice(c.price))}</p>
        </td>
      </tr>`;
    })
    .join('');

  return `
    <div style="margin:28px 0 0;padding-top:8px;border-top:1px solid ${BORDER};">
      <h2 style="margin:0 0 16px;font-size:18px;font-weight:700;color:#0f172a;">${escapeHtml(heading)}</h2>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
    </div>`;
}

/**
 * @param {{ name: string; email: string; role: 'student' | 'teacher'; courses?: Array<object> }} params
 * @returns {{ subject: string; html: string; text: string }}
 */
export function buildWelcomeEmail({ name, email, role, courses = [] }) {
  const content = copy[role] ?? copy.student;
  const clientUrl = env.clientUrl.replace(/\/$/, '');
  const coursesUrl = `${clientUrl}/courses`;
  const profileUrl = `${clientUrl}/profile`;
  const loginUrl = `${clientUrl}/login`;
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);

  const coursesHtml = courses.length
    ? courseListSection(courses, coursesUrl, content.coursesHeading)
    : `<p style="margin:24px 0 0;font-size:15px;line-height:1.6;color:#475569;">${content.coursesEmpty}</p>`;

  const bodyHtml = `
    <h1 style="margin:0 0 12px;font-size:26px;font-weight:700;color:#0f172a;letter-spacing:-0.02em;">${content.headline}</h1>
    <p style="margin:0 0 8px;font-size:17px;line-height:1.5;color:#334155;">
      Hi <strong style="color:#0f172a;">${safeName}</strong>,
    </p>
    <p style="margin:0 0 4px;font-size:16px;line-height:1.65;color:#475569;">
      ${content.intro}
    </p>
    <p style="margin:16px 0 0;font-size:14px;color:#64748b;">
      Registered as <strong style="color:#4f46e5;">${content.roleLabel}</strong> &middot; ${safeEmail}
    </p>
    ${coursesHtml}
    ${emailButton(coursesUrl, content.coursesCta)}
    ${featureList(content.features)}
    ${emailButton(profileUrl, content.profileCta)}
    <p style="margin:24px 0 0;font-size:14px;line-height:1.6;color:#64748b;text-align:center;">
      Already signed in?
      <a href="${loginUrl}" style="color:#4f46e5;font-weight:600;text-decoration:none;">Go to login</a>
    </p>
  `;

  const html = wrapEmail({
    preheader: content.preheader,
    title: content.subject,
    bodyHtml,
  });

  const courseLines = courses.length
    ? [
        '',
        content.coursesHeading,
        ...courses.map((c) => {
          const meta = [c.category, c.level, c.instructorName, formatPrice(c.price)]
            .filter(Boolean)
            .join(' · ');
          return `  • ${c.title}${meta ? ` (${meta})` : ''}`;
        }),
        '',
        `${content.coursesCta}: ${coursesUrl}`,
      ]
    : ['', content.coursesEmpty, '', `${content.coursesCta}: ${coursesUrl}`];

  const text = [
    content.headline,
    '',
    `Hi ${name},`,
    '',
    content.intro,
    ...courseLines,
    '',
    'What you can do next:',
    ...content.features.map((f) => `  • ${f}`),
    '',
    `${content.profileCta}: ${profileUrl}`,
    `Login: ${loginUrl}`,
    '',
    `Account: ${email} (${content.roleLabel})`,
    '',
    '— TeachersPoints',
  ].join('\n');

  return { subject: content.subject, html, text };
}
