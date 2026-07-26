import { escapeHtml } from './escapeHtml.js';
import { wrapEmail, emailButton } from './baseLayout.js';
import { getEmailClientUrl } from './brand.js';

export function buildRequirementSubmittedEmail({ studentName, requirementTitle, myPostsUrl }) {
  const safeName = escapeHtml(studentName || 'there');
  const safeTitle = escapeHtml(requirementTitle);
  const link = myPostsUrl || `${getEmailClientUrl()}/my-posts`;

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155;">
      Hi ${safeName},
    </p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155;">
      We received your tutoring requirement <strong>"${safeTitle}"</strong>.
      It is now <strong>pending admin review</strong>.
    </p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155;">
      Once approved, it will appear on the Tutor Jobs board so verified tutors can apply.
      You can track status anytime in My Posts.
    </p>
    ${emailButton(link, 'View My Posts')}
    <p style="margin:20px 0 0;font-size:14px;line-height:1.6;color:#64748b;">
      We may contact the phone number you provided to confirm this requirement. We will never spam you.
    </p>
  `;

  return {
    subject: 'Requirement received — pending review · TeacherPoint',
    preheader: `Your post "${requirementTitle}" is pending review`,
    html: wrapEmail({
      preheader: `Your requirement "${requirementTitle}" was submitted`,
      title: 'Requirement submitted',
      bodyHtml,
    }),
    text: [
      `Hi ${studentName || 'there'},`,
      '',
      `We received your requirement "${requirementTitle}". It is pending admin review.`,
      '',
      `View My Posts: ${link}`,
      '',
      '— TeacherPoint',
    ].join('\n'),
  };
}
