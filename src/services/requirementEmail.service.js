import logger from '../config/logger.js';
import env from '../config/env.js';
import { sendMail } from './email.service.js';
import { buildRequirementApprovedEmail } from '../templates/email/requirementApprovedEmail.js';

export async function sendRequirementApprovedEmail({ studentEmail, studentName, requirementTitle }) {
  if (!studentEmail) {
    return { sent: false, stub: true, reason: 'no_email' };
  }

  const clientUrl = env.CLIENT_URL || 'http://localhost:5173';
  const { subject, html, text } = buildRequirementApprovedEmail({
    studentName,
    requirementTitle,
    jobsUrl: `${clientUrl}/tutor-jobs`,
  });

  try {
    const result = await sendMail({ to: studentEmail, subject, html, text });
    if (result.stub) {
      logger.warn('[requirement-email] SMTP not configured', { to: studentEmail });
      return { sent: false, stub: true, reason: result.reason || 'not_configured' };
    }
    logger.info(`[requirement-email] approval sent to ${studentEmail}`);
    return { sent: true, stub: false };
  } catch (err) {
    logger.error(`[requirement-email] failed for ${studentEmail}: ${err.message}`);
    return { sent: false, stub: false, error: err.message };
  }
}
