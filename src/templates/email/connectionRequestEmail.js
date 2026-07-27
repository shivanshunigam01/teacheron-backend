import { escapeHtml } from './escapeHtml.js';
import { wrapEmail, emailButton } from './baseLayout.js';
import { getEmailClientUrl } from './brand.js';

/** Teacher notified when a student/parent requests to connect. */
export function buildConnectionRequestEmail({
  teacherName,
  learnerName,
  learnerRole,
  source,
  dashboardUrl,
}) {
  const safeTeacher = escapeHtml(teacherName || 'Tutor');
  const safeLearner = escapeHtml(learnerName || 'A learner');
  const roleLabel = learnerRole === 'parent' ? 'parent' : 'student';
  const action =
    source === 'hire' ? 'hire you' : source === 'call' ? 'call / get your number' : 'message you';
  const link = dashboardUrl || `${getEmailClientUrl()}/teacher`;

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155;">
      Hi ${safeTeacher},
    </p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155;">
      <strong>${safeLearner}</strong> (${roleLabel}) wants to ${action} on TeacherPoint.
      Their connection request has been sent to our admin team for review.
    </p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155;">
      Until the request is approved and the learner completes payment, messaging stays limited
      and your phone number remains masked. You can follow the conversation in your teacher dashboard.
    </p>
    ${emailButton(link, 'Open teacher dashboard')}
  `;

  return {
    subject: `${learnerName || 'A learner'} requested to connect — TeacherPoint`,
    preheader: `${learnerName || 'Someone'} wants to connect with you`,
    html: wrapEmail({
      preheader: `New connection request from ${learnerName || 'a learner'}`,
      title: 'New connection request',
      bodyHtml,
    }),
    text: [
      `Hi ${teacherName || 'Tutor'},`,
      '',
      `${learnerName || 'A learner'} (${roleLabel}) wants to ${action} on TeacherPoint.`,
      'The request is with admin for review. Messaging stays limited until approval and payment.',
      '',
      `Dashboard: ${link}`,
      '',
      '— TeacherPoint',
    ].join('\n'),
  };
}
