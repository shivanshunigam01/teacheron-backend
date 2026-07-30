import { sendMail } from './email.service.js';
import logger from '../config/logger.js';
import {
  buildAccommodationEnquiryOpenedEmail,
  buildAccommodationEnquiryReplyEmail,
} from '../templates/email/accommodationEnquiryEmail.js';
import { getEmailClientUrl } from '../templates/email/brand.js';

function clientBase() {
  return getEmailClientUrl();
}

function adminInboxEmail() {
  return (
    process.env.MAIL_ADMIN_EMAIL ||
    process.env.ADMIN_EMAIL ||
    process.env.MAIL_FROM_EMAIL ||
    process.env.SMTP_USER ||
    'support@teacherpoint.org'
  );
}

export async function sendAccommodationEnquiryOpenedEmail({
  learnerName,
  learnerRole,
  learnerEmail,
  learnerPhone,
  accommodationName,
  city,
  country,
  message,
}) {
  const to = adminInboxEmail();
  if (!to) return { sent: false };

  const content = buildAccommodationEnquiryOpenedEmail({
    learnerName,
    learnerRole,
    learnerEmail,
    learnerPhone,
    accommodationName,
    city,
    country,
    message,
    adminUrl: `${clientBase()}/admin#inquiries`,
  });

  try {
    const result = await sendMail({
      to,
      subject: content.subject,
      html: content.html,
      text: content.text,
      replyTo: learnerEmail || undefined,
    });
    if (result.stub) {
      logger.warn('[accommodation-email] SMTP stub (enquiry opened)', { to });
      return { sent: false, stub: true };
    }
    logger.info(`[accommodation-email] enquiry opened notice sent to ${to}`);
    return { sent: true };
  } catch (err) {
    logger.error(`[accommodation-email] enquiry opened failed: ${err.message}`);
    return { sent: false, error: err.message };
  }
}

export async function sendAccommodationEnquiryReplyEmail({
  learnerEmail,
  learnerName,
  learnerRole,
  accommodationName,
  replyBody,
}) {
  if (!learnerEmail) return { sent: false };

  const dashboardPath =
    learnerRole === 'parent' ? '/parent#accommodation' : '/student#accommodation';

  const content = buildAccommodationEnquiryReplyEmail({
    learnerName,
    accommodationName,
    replyBody,
    dashboardUrl: `${clientBase()}${dashboardPath}`,
  });

  try {
    const result = await sendMail({
      to: learnerEmail,
      subject: content.subject,
      html: content.html,
      text: content.text,
    });
    if (result.stub) {
      logger.warn('[accommodation-email] SMTP stub (admin reply)', { to: learnerEmail });
      return { sent: false, stub: true };
    }
    logger.info(`[accommodation-email] admin reply notice sent to ${learnerEmail}`);
    return { sent: true };
  } catch (err) {
    logger.error(`[accommodation-email] admin reply failed: ${err.message}`);
    return { sent: false, error: err.message };
  }
}
