import { escapeHtml } from './escapeHtml.js';
import { wrapEmail, emailButton } from './baseLayout.js';
import { getEmailClientUrl } from './brand.js';

/** Notify admin that a student/parent opened an accommodation enquiry. */
export function buildAccommodationEnquiryOpenedEmail({
  learnerName,
  learnerRole,
  learnerEmail,
  learnerPhone,
  accommodationName,
  city,
  country,
  message,
  adminUrl,
}) {
  const safeName = escapeHtml(learnerName || 'A learner');
  const safeRole = escapeHtml(learnerRole || 'student');
  const safeListing = escapeHtml(accommodationName || 'an accommodation listing');
  const safeCity = escapeHtml([city, country].filter(Boolean).join(', ') || '—');
  const safeMsg = escapeHtml(message || '');
  const safeEmail = escapeHtml(learnerEmail || '—');
  const safePhone = escapeHtml(learnerPhone || '—');
  const link = adminUrl || `${getEmailClientUrl()}/admin#inquiries`;

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155;">
      A new accommodation enquiry was raised on TeacherPoint.
    </p>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 20px;margin:0 0 20px;">
      <p style="margin:0 0 8px;font-size:15px;color:#0f172a;"><strong>From:</strong> ${safeName} (${safeRole})</p>
      <p style="margin:0 0 8px;font-size:15px;color:#0f172a;"><strong>Email:</strong> ${safeEmail}</p>
      <p style="margin:0 0 8px;font-size:15px;color:#0f172a;"><strong>Phone:</strong> ${safePhone}</p>
      <p style="margin:0 0 8px;font-size:15px;color:#0f172a;"><strong>Listing:</strong> ${safeListing}</p>
      <p style="margin:0 0 8px;font-size:15px;color:#0f172a;"><strong>Location:</strong> ${safeCity}</p>
      <p style="margin:12px 0 0;font-size:15px;color:#0f172a;"><strong>Message:</strong></p>
      <p style="margin:6px 0 0;font-size:15px;line-height:1.5;color:#334155;white-space:pre-wrap;">${safeMsg}</p>
    </div>
    ${emailButton(link, 'Open enquiries in admin')}
  `;

  return {
    subject: `New accommodation enquiry from ${learnerName || 'a learner'} — TeacherPoint`,
    preheader: `${learnerName || 'Someone'} asked about ${accommodationName || 'a listing'}`,
    html: wrapEmail({
      preheader: 'New accommodation enquiry',
      title: 'New accommodation enquiry',
      bodyHtml,
    }),
    text: [
      'New accommodation enquiry',
      '',
      `From: ${learnerName || 'A learner'} (${learnerRole || 'student'})`,
      `Email: ${learnerEmail || '—'}`,
      `Phone: ${learnerPhone || '—'}`,
      `Listing: ${accommodationName || '—'}`,
      `Location: ${[city, country].filter(Boolean).join(', ') || '—'}`,
      '',
      'Message:',
      message || '',
      '',
      `Admin: ${link}`,
      '',
      '— TeacherPoint',
    ].join('\n'),
  };
}

/** Notify the learner that admin replied to their accommodation enquiry. */
export function buildAccommodationEnquiryReplyEmail({
  learnerName,
  accommodationName,
  replyBody,
  dashboardUrl,
}) {
  const safeName = escapeHtml(learnerName || 'there');
  const safeListing = escapeHtml(accommodationName || 'your accommodation enquiry');
  const safeReply = escapeHtml(replyBody || '');
  const link = dashboardUrl || `${getEmailClientUrl()}/student#accommodation`;

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155;">
      Hi ${safeName},
    </p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155;">
      TeacherPoint support replied to your enquiry about <strong>${safeListing}</strong>:
    </p>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 20px;margin:0 0 20px;">
      <p style="margin:0;font-size:15px;line-height:1.6;color:#0f172a;white-space:pre-wrap;">${safeReply}</p>
    </div>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#64748b;">
      Sign in to continue the conversation in your dashboard.
    </p>
    ${emailButton(link, 'View conversation')}
  `;

  return {
    subject: `Reply on your accommodation enquiry — TeacherPoint`,
    preheader: `Support replied about ${accommodationName || 'your enquiry'}`,
    html: wrapEmail({
      preheader: 'Support replied to your enquiry',
      title: 'Support replied',
      bodyHtml,
    }),
    text: [
      `Hi ${learnerName || 'there'},`,
      '',
      `TeacherPoint support replied about ${accommodationName || 'your accommodation enquiry'}:`,
      '',
      replyBody || '',
      '',
      `Continue the chat: ${link}`,
      '',
      '— TeacherPoint',
    ].join('\n'),
  };
}
