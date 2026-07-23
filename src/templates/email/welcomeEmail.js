import { escapeHtml } from './escapeHtml.js';
import { wrapEmail, emailButton, emailButtonOutline, featureList, sectionHeading } from './baseLayout.js';
import {
  getCourseDetailUrl,
  getCoursesCatalogUrl,
  getLoginUrl,
  getStudentDashboardUrl,
  getTeacherDashboardUrl,
  getParentDashboardUrl,
  normalizeEmailAssetUrl,
} from './brand.js';

const PRIMARY = '#6366f1';
const BORDER = '#e2e8f0';
const MUTED = '#64748b';

const copy = {
  student: {
    subject: 'Welcome to TeacherPoint — your profile is ready',
    preheader: 'Your student profile is complete. Browse courses and start learning today.',
    headline: 'Welcome aboard, learner!',
    intro:
      'Thanks for completing your TeacherPoint student profile. Your account is fully active — explore expert-led courses, connect with tutors, and start learning at your own pace.',
    coursesHeading: 'Popular courses for you',
    coursesEmpty:
      'New courses are added every week. Browse our full catalog to find subjects that match your goals.',
    features: [
      'Enroll in live and self-paced courses',
      'Track progress and earn certificates',
      'Message tutors and join the Student Exchange',
      'Post tutoring requirements and find the right match',
    ],
    coursesCta: 'Browse all courses',
    profileCta: 'Open student dashboard',
    roleLabel: 'student',
    courseBtn: 'View course',
  },
  teacher: {
    subject: 'Welcome to TeacherPoint — grow your teaching practice',
    preheader: 'Your tutor profile is live. Reach students who need your expertise.',
    headline: 'Welcome aboard, tutor!',
    intro:
      'Thanks for completing your TeacherPoint tutor profile. You are ready to publish courses, set rates, and connect with students worldwide.',
    coursesHeading: 'Featured courses on the platform',
    coursesEmpty:
      'Explore the course catalog to see what students enroll in — then create your own offerings.',
    features: [
      'Publish courses and manage enrollments',
      'Set subjects, rates, and availability',
      'Reach students through our global marketplace',
      'Get verified to build trust with new learners',
    ],
    coursesCta: 'Explore all courses',
    profileCta: 'Open tutor dashboard',
    roleLabel: 'tutor',
    courseBtn: 'View course',
  },
  parent: {
    subject: 'Welcome to TeacherPoint — find the right tutor for your child',
    preheader: 'Your parent profile is complete. Post requirements and browse tutors.',
    headline: 'Welcome aboard, parent!',
    intro:
      'Thanks for completing your TeacherPoint parent profile. You can now post tutoring needs, browse verified tutors, and support your child’s learning journey.',
    coursesHeading: 'Popular courses families explore',
    coursesEmpty:
      'Browse our catalog for courses that complement one-to-one tutoring for your child.',
    features: [
      'Post tutoring requirements for your child',
      'Browse and shortlist verified tutors',
      'Track applications and messages in one place',
      'Manage payments securely through TeacherPoint',
    ],
    coursesCta: 'Browse courses',
    profileCta: 'Open parent dashboard',
    roleLabel: 'parent',
    courseBtn: 'View course',
  },
};

function formatPrice(price) {
  if (price == null || Number.isNaN(Number(price))) return 'Explore pricing';
  const n = Number(price);
  if (n === 0) return 'Free';
  return `$${n % 1 === 0 ? n : n.toFixed(2)}`;
}

function courseCard(course, btnLabel) {
  const href = getCourseDetailUrl(course);
  const safeHref = escapeHtml(href);
  const meta = [
    course.category,
    course.level,
    course.instructorName ? `by ${course.instructorName}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const stats = [
    course.rating ? `★ ${Number(course.rating).toFixed(1)}` : null,
    course.students ? `${Number(course.students).toLocaleString()} students` : null,
    course.duration,
  ]
    .filter(Boolean)
    .join(' · ');

  const imageBlock = course.imageUrl
    ? `<img src="${escapeHtml(normalizeEmailAssetUrl(course.imageUrl))}" alt="" width="88" height="88" class="course-img" style="display:block;width:88px;height:88px;object-fit:cover;border-radius:12px;border:1px solid ${BORDER};" />`
    : `<div style="width:88px;height:88px;border-radius:12px;background:linear-gradient(135deg,#6366f1,#a855f7);border:1px solid ${BORDER};"></div>`;

  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;border:1px solid ${BORDER};border-radius:16px;overflow:hidden;background:#ffffff;box-shadow:0 2px 12px rgba(15,23,42,0.04);">
  <tr>
    <td style="padding:16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td width="88" valign="top" style="padding-right:14px;">${imageBlock}</td>
          <td valign="top">
            <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:${PRIMARY};">${escapeHtml(course.category || 'Course')}</p>
            <a href="${safeHref}" style="font-size:17px;font-weight:700;line-height:1.35;color:#0f172a;text-decoration:none;">${escapeHtml(course.title)}</a>
            <p style="margin:6px 0 0;font-size:13px;line-height:1.5;color:${MUTED};">${escapeHtml(meta)}</p>
            ${stats ? `<p style="margin:4px 0 0;font-size:12px;color:#94a3b8;">${escapeHtml(stats)}</p>` : ''}
            <p style="margin:10px 0 12px;font-size:16px;font-weight:800;color:#0f172a;">${escapeHtml(formatPrice(course.price))}</p>
            ${emailButtonOutline(href, btnLabel)}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

function courseListSection(courses, heading, btnLabel) {
  if (!courses?.length) return '';
  const cards = courses.map((c) => courseCard(c, btnLabel)).join('');
  return `${sectionHeading(heading)}${cards}`;
}

/**
 * @param {{ name: string; email: string; role: 'student' | 'teacher' | 'parent'; courses?: Array<object> }} params
 */
export function buildWelcomeEmail({ name, email, role, courses = [] }) {
  const content = copy[role] ?? copy.student;
  const coursesUrl = getCoursesCatalogUrl();
  const profileUrl =
    role === 'teacher'
      ? getTeacherDashboardUrl()
      : role === 'parent'
        ? getParentDashboardUrl()
        : getStudentDashboardUrl();
  const loginUrl = getLoginUrl();
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);

  const coursesHtml = courses.length
    ? courseListSection(courses, content.coursesHeading, content.courseBtn)
    : `<p style="margin:24px 0 0;font-size:15px;line-height:1.65;color:#475569;">${content.coursesEmpty}</p>`;

  const bodyHtml = `
    <h1 style="margin:0 0 14px;font-size:28px;font-weight:800;color:#0f172a;letter-spacing:-0.03em;line-height:1.2;">${content.headline}</h1>
    <p style="margin:0 0 10px;font-size:18px;line-height:1.5;color:#334155;">
      Hi <strong style="color:#0f172a;">${safeName}</strong> 👋
    </p>
    <p style="margin:0;font-size:16px;line-height:1.7;color:#475569;">
      ${content.intro}
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0 0;">
      <tr>
        <td style="background:#eef2ff;border:1px solid #c7d2fe;border-radius:12px;padding:10px 16px;">
          <span style="font-size:13px;color:#4338ca;font-weight:600;">Account:</span>
          <span style="font-size:13px;color:#334155;"> ${safeEmail}</span>
          <span style="font-size:13px;color:#94a3b8;"> · </span>
          <span style="font-size:13px;color:#4338ca;font-weight:600;text-transform:capitalize;">${content.roleLabel}</span>
        </td>
      </tr>
    </table>
    ${coursesHtml}
    ${emailButton(coursesUrl, content.coursesCta)}
    ${sectionHeading('What you can do next')}
    ${featureList(content.features)}
    ${emailButton(profileUrl, content.profileCta)}
    <p style="margin:28px 0 0;font-size:14px;line-height:1.6;color:#64748b;text-align:center;">
      Already signed in?
      <a href="${loginUrl}" style="color:${PRIMARY};font-weight:700;text-decoration:none;">Go to login →</a>
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
          const link = getCourseDetailUrl(c);
          const meta = [c.category, c.level, formatPrice(c.price)].filter(Boolean).join(' · ');
          return `  • ${c.title}${meta ? ` (${meta})` : ''}\n    ${link}`;
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
    `All courses: ${coursesUrl}`,
    `Login: ${loginUrl}`,
    '',
    `Account: ${email} (${content.roleLabel})`,
    '',
    '— TeacherPoint',
  ].join('\n');

  return { subject: content.subject, html, text };
}
