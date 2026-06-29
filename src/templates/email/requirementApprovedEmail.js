import { escapeHtml } from './escapeHtml.js';
import { wrapEmail, emailButton } from './baseLayout.js';
import { getEmailClientUrl } from './brand.js';

export function buildRequirementApprovedEmail({ studentName, requirementTitle, jobsUrl }) {
  const safeName = escapeHtml(studentName || 'there');
  const safeTitle = escapeHtml(requirementTitle);
  const link = jobsUrl || `${getEmailClientUrl()}/tutor-jobs`;

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155;">
      Hi ${safeName},
    </p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155;">
      Great news — your tutoring requirement <strong>"${safeTitle}"</strong> has been reviewed and
      <strong>approved by the TeacherPoint admin team</strong>.
    </p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155;">
      It is now live on our Tutor Jobs board. Verified tutors can view your post and send proposals.
    </p>
    ${emailButton(link, 'View tutor jobs')}
    <p style="margin:20px 0 0;font-size:14px;line-height:1.6;color:#64748b;">
      You will receive tutor applications on your registered email. Reply from your student dashboard or messages.
    </p>
  `;

  return {
    subject: 'Your tutoring requirement is now live — TeacherPoint',
    preheader: `Your post "${requirementTitle}" was approved`,
    html: wrapEmail({
      preheader: `Your requirement "${requirementTitle}" is approved`,
      title: 'Requirement approved',
      bodyHtml,
    }),
    text: [
      `Hi ${studentName || 'there'},`,
      '',
      `Your requirement "${requirementTitle}" has been approved and is now visible to tutors on TeacherPoint.`,
      '',
      `View tutor jobs: ${link}`,
      '',
      '— TeacherPoint',
    ].join('\n'),
  };
}
