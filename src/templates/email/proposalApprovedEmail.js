import { escapeHtml } from './escapeHtml.js';
import { wrapEmail, emailButton } from './baseLayout.js';
import { getEmailClientUrl } from './brand.js';

export function buildProposalApprovedEmail({ teacherName, requirementTitle, jobUrl }) {
  const safeName = escapeHtml(teacherName || 'Tutor');
  const safeTitle = escapeHtml(requirementTitle);
  const link = jobUrl || `${getEmailClientUrl()}/teacher`;

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155;">
      Hi ${safeName},
    </p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155;">
      Congratulations — your application for <strong>"${safeTitle}"</strong> has been
      <strong>approved by the TeacherPoint admin team</strong>.
    </p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155;">
      You have been assigned to this tutoring role. Sign in to your teacher dashboard to view the
      job details and next steps.
    </p>
    ${emailButton(link, 'View my assignments')}
    <p style="margin:20px 0 0;font-size:14px;line-height:1.6;color:#64748b;">
      We will share student contact details according to our platform process. Reply from your dashboard if you have questions.
    </p>
  `;

  return {
    subject: 'You have been assigned to a tutoring job — TeacherPoint',
    preheader: `Approved for "${requirementTitle}"`,
    html: wrapEmail({
      preheader: `You were assigned to "${requirementTitle}"`,
      title: 'Job application approved',
      bodyHtml,
    }),
    text: [
      `Hi ${teacherName || 'Tutor'},`,
      '',
      `Your application for "${requirementTitle}" has been approved. You have been assigned to this tutoring role.`,
      '',
      `View your dashboard: ${link}`,
      '',
      '— TeacherPoint',
    ].join('\n'),
  };
}
