import { escapeHtml } from './escapeHtml.js';
import { wrapEmail, emailButton } from './baseLayout.js';
import { getEmailClientUrl } from './brand.js';

/** Sent to teacher after admin approves a connection request. */
export function buildConnectionApprovedTeacherEmail({
  teacherName,
  learnerName,
  amount,
  currency,
  dashboardUrl,
}) {
  const safeTeacher = escapeHtml(teacherName || 'Tutor');
  const safeLearner = escapeHtml(learnerName || 'the learner');
  const link = dashboardUrl || `${getEmailClientUrl()}/teacher`;
  const fee =
    amount > 0
      ? ` They will be asked to pay ${escapeHtml(String(currency || 'INR'))} ${escapeHtml(String(amount))} to unlock full contact.`
      : '';

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155;">
      Hi ${safeTeacher},
    </p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155;">
      Good news — admin has <strong>approved</strong> the connection request from
      <strong>${safeLearner}</strong>.${fee}
    </p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155;">
      Once they complete payment, you will both have full messaging and contact details.
    </p>
    ${emailButton(link, 'View in dashboard')}
  `;

  return {
    subject: 'Connection request approved — TeacherPoint',
    preheader: `Approved to connect with ${learnerName || 'a learner'}`,
    html: wrapEmail({
      preheader: 'Your connection request was approved',
      title: 'Connection approved',
      bodyHtml,
    }),
    text: [
      `Hi ${teacherName || 'Tutor'},`,
      '',
      `Admin approved the connection request from ${learnerName || 'the learner'}.`,
      'Full contact unlocks after they complete payment.',
      '',
      `Dashboard: ${link}`,
      '',
      '— TeacherPoint',
    ].join('\n'),
  };
}

/** Sent to student/parent after admin approves — prompts payment. */
export function buildConnectionApprovedLearnerEmail({
  learnerName,
  teacherName,
  amount,
  currency,
  payUrl,
}) {
  const safeLearner = escapeHtml(learnerName || 'there');
  const safeTeacher = escapeHtml(teacherName || 'your tutor');
  const link = payUrl || `${getEmailClientUrl()}/tutors`;
  const feeLine =
    amount > 0
      ? `Please pay <strong>${escapeHtml(String(currency || 'INR'))} ${escapeHtml(String(amount))}</strong> to unlock unlimited messaging and the tutor’s full phone number.`
      : 'Please complete payment on the tutor profile to unlock full contact.';

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155;">
      Hi ${safeLearner},
    </p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155;">
      Admin has <strong>approved</strong> your request to connect with
      <strong>${safeTeacher}</strong>.
    </p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155;">
      ${feeLine}
    </p>
    ${emailButton(link, 'Pay & unlock contact')}
  `;

  return {
    subject: 'Your tutor connection was approved — complete payment — TeacherPoint',
    preheader: `Approved to connect with ${teacherName || 'your tutor'}`,
    html: wrapEmail({
      preheader: 'Connection approved — payment required',
      title: 'Connection approved',
      bodyHtml,
    }),
    text: [
      `Hi ${learnerName || 'there'},`,
      '',
      `Admin approved your request to connect with ${teacherName || 'your tutor'}.`,
      amount > 0
        ? `Pay ${currency || 'INR'} ${amount} to unlock full messaging and the tutor phone number.`
        : 'Complete payment on the tutor profile to unlock full contact.',
      '',
      `Pay here: ${link}`,
      '',
      '— TeacherPoint',
    ].join('\n'),
  };
}
