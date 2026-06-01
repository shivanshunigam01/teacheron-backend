import logger from '../config/logger.js';
import { sendMail } from './email.service.js';
import { buildTutorPhoneEmail } from '../templates/email/tutorPhoneEmail.js';
import env from '../config/env.js';

export async function sendTutorPhoneEmail({
  studentEmail,
  studentName,
  tutorName,
  phone,
  tutorEmail,
  tutorId,
}) {
  if (!studentEmail) {
    throw new Error('Missing student email');
  }
  if (!phone?.trim()) {
    throw new Error('Tutor has no phone number on file');
  }

  const clientUrl = env.CLIENT_URL || 'http://localhost:5173';
  const { subject, html, text } = buildTutorPhoneEmail({
    studentName,
    tutorName,
    phone,
    tutorEmail,
    tutorProfileUrl: `${clientUrl}/tutors/${tutorId}`,
  });

  try {
    const result = await sendMail({ to: studentEmail, subject, html, text });
    if (result.stub) {
      logger.warn('[tutor-phone-email] SMTP not configured', { to: studentEmail });
      return { sent: false, stub: true, reason: result.reason || 'not_configured' };
    }
    logger.info(`[tutor-phone-email] sent to ${studentEmail} for tutor ${tutorId}`);
    return { sent: true, stub: false };
  } catch (err) {
    logger.error(`[tutor-phone-email] failed for ${studentEmail}: ${err.message}`);
    throw err;
  }
}
