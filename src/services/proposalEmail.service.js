import { sendMail } from './email.service.js';
import logger from '../config/logger.js';
import { buildProposalApprovedEmail } from '../templates/email/proposalApprovedEmail.js';

export async function sendProposalApprovedEmail({
  teacherEmail,
  teacherName,
  requirementTitle,
  jobUrl,
}) {
  if (!teacherEmail) return { sent: false };

  const content = buildProposalApprovedEmail({ teacherName, requirementTitle, jobUrl });

  try {
    const result = await sendMail({
      to: teacherEmail,
      subject: content.subject,
      html: content.html,
      text: content.text,
    });
    if (result.stub) {
      logger.warn('[proposal-email] SMTP not configured', { to: teacherEmail });
      return { sent: false, stub: true };
    }
    logger.info(`[proposal-email] approval sent to ${teacherEmail}`);
    return { sent: true };
  } catch (err) {
    logger.error(`[proposal-email] failed for ${teacherEmail}: ${err.message}`);
    return { sent: false, error: err.message };
  }
}
