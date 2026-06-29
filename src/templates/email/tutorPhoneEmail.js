import { escapeHtml } from './escapeHtml.js';
import { wrapEmail, emailButton } from './baseLayout.js';
import { getEmailClientUrl } from './brand.js';

export function buildTutorPhoneEmail({
  studentName,
  tutorName,
  phone,
  tutorEmail,
  tutorProfileUrl,
}) {
  const safeStudent = escapeHtml(studentName || 'there');
  const safeTutor = escapeHtml(tutorName);
  const safePhone = escapeHtml(phone);
  const safeEmail = tutorEmail ? escapeHtml(tutorEmail) : '';
  const profileUrl = tutorProfileUrl || getEmailClientUrl();

  const contactLines = [
    `<strong>Phone:</strong> <a href="tel:${safePhone.replace(/\s/g, '')}">${safePhone}</a>`,
  ];
  if (safeEmail) {
    contactLines.push(`<strong>Email:</strong> <a href="mailto:${safeEmail}">${safeEmail}</a>`);
  }

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155;">
      Hi ${safeStudent},
    </p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155;">
      You requested contact details for tutor <strong>${safeTutor}</strong> on TeacherPoint.
      Here are their details:
    </p>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 20px;margin:0 0 20px;">
      ${contactLines.map((line) => `<p style="margin:0 0 8px;font-size:15px;line-height:1.5;color:#0f172a;">${line}</p>`).join('')}
    </div>
    <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#64748b;">
      Please use these details respectfully and only for tutoring-related communication.
    </p>
    ${emailButton(profileUrl, `View ${safeTutor}'s profile`)}
  `;

  return {
    subject: `Contact details for ${tutorName}`,
    preheader: `Phone number for ${tutorName} — TeacherPoint`,
    html: wrapEmail({
      preheader: `Phone number for ${tutorName}`,
      title: `Contact details — ${tutorName}`,
      bodyHtml,
    }),
    text: [
      `Hi ${studentName || 'there'},`,
      '',
      `You requested contact details for tutor ${tutorName}.`,
      `Phone: ${phone}`,
      tutorEmail ? `Email: ${tutorEmail}` : '',
      '',
      'Please use these details only for tutoring-related communication.',
    ]
      .filter(Boolean)
      .join('\n'),
  };
}
