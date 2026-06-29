import { escapeHtml } from './escapeHtml.js';
import { getCourseDetailUrl, getCoursesCatalogUrl, getEmailClientUrl } from './brand.js';

const PRIMARY = '#4f46e5';
const BORDER = '#e2e8f0';
const MUTED = '#64748b';

function formatPrice(price) {
  if (price == null || Number.isNaN(Number(price))) return 'Free';
  const n = Number(price);
  if (n === 0) return 'Free';
  return `$${n.toFixed(n % 1 === 0 ? 0 : 2)}`;
}

/**
 * @param {Array<{ title: string; slug?: string; instructorName?: string; category?: string; level?: string; price?: number; rating?: number; students?: number; duration?: string }>} courses
 */
export function courseCatalogHtml(courses, { heading, viewAllLabel = 'Browse all courses' } = {}) {
  if (!courses?.length) return '';

  const coursesUrl = getCoursesCatalogUrl();
  const safeHeading = escapeHtml(heading ?? 'Popular courses for you');

  const rows = courses
    .map((c) => {
      const href = escapeHtml(getCourseDetailUrl(c));
      const title = escapeHtml(c.title);
      const meta = [
        c.category ? escapeHtml(c.category) : null,
        c.level ? escapeHtml(c.level) : null,
        c.duration ? escapeHtml(c.duration) : null,
      ]
        .filter(Boolean)
        .join(' · ');
      const instructor = escapeHtml(c.instructorName || 'Expert instructor');
      const price = escapeHtml(formatPrice(c.price));
      const rating =
        c.rating != null ? `<span style="color:#f59e0b;">★ ${Number(c.rating).toFixed(1)}</span>` : '';
      const learners =
        c.students != null && c.students > 0
          ? `<span style="color:${MUTED};font-size:12px;">${Number(c.students).toLocaleString()} learners</span>`
          : '';

      return `
<tr>
  <td style="padding:12px 0;border-bottom:1px solid ${BORDER};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="vertical-align:top;">
          <a href="${href}" style="font-size:16px;font-weight:600;color:#0f172a;text-decoration:none;">${title}</a>
          <p style="margin:4px 0 0;font-size:13px;color:${MUTED};">by ${instructor}</p>
          ${meta ? `<p style="margin:2px 0 0;font-size:12px;color:#94a3b8;">${meta}</p>` : ''}
          <p style="margin:6px 0 0;font-size:12px;">${rating} ${learners ? `&nbsp;·&nbsp; ${learners}` : ''}</p>
        </td>
        <td width="72" align="right" style="vertical-align:top;font-size:15px;font-weight:700;color:${PRIMARY};white-space:nowrap;">
          ${price}
        </td>
      </tr>
    </table>
  </td>
</tr>`;
    })
    .join('');

  return `
<div style="margin:28px 0 0;padding-top:24px;border-top:1px solid ${BORDER};">
  <h2 style="margin:0 0 4px;font-size:20px;font-weight:700;color:#0f172a;">${safeHeading}</h2>
  <p style="margin:0 0 16px;font-size:14px;color:${MUTED};line-height:1.5;">
    Here are courses you can explore right now on TeacherPoint:
  </p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    ${rows}
  </table>
  <p style="margin:20px 0 0;text-align:center;">
    <a href="${coursesUrl}" style="display:inline-block;font-size:15px;font-weight:600;color:${PRIMARY};text-decoration:none;">
      ${escapeHtml(viewAllLabel)} →
    </a>
  </p>
</div>`;
}

export function courseCatalogText(courses, heading = 'Available courses') {
  if (!courses?.length) return '';
  const clientUrl = getEmailClientUrl();
  const lines = [
    '',
    heading,
    '—'.repeat(heading.length),
    ...courses.map((c) => {
      const price = formatPrice(c.price);
      const bits = [c.title, `by ${c.instructorName || 'Expert instructor'}`, price];
      if (c.category) bits.push(c.category);
      return `  • ${bits.join(' — ')}`;
    }),
    '',
    `Browse all: ${clientUrl}/courses`,
  ];
  return lines.join('\n');
}
