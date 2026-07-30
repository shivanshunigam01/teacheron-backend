import { sendMail } from './email.service.js';
import logger from '../config/logger.js';
import { buildConnectionRequestEmail } from '../templates/email/connectionRequestEmail.js';
import {
  buildConnectionApprovedTeacherEmail,
  buildConnectionApprovedLearnerEmail,
} from '../templates/email/connectionApprovedEmail.js';
import { getEmailClientUrl } from '../templates/email/brand.js';

function clientBase() {
  return getEmailClientUrl();
}

export async function sendConnectionRequestEmail({
  teacherEmail,
  teacherName,
  learnerName,
  learnerRole,
  source,
}) {
  if (!teacherEmail) return { sent: false };

  const content = buildConnectionRequestEmail({
    teacherName,
    learnerName,
    learnerRole,
    source,
    dashboardUrl: `${clientBase()}/teacher#connections`,
  });

  try {
    const result = await sendMail({
      to: teacherEmail,
      subject: content.subject,
      html: content.html,
      text: content.text,
    });
    if (result.stub) {
      logger.warn('[connection-email] SMTP not configured', { to: teacherEmail });
      return { sent: false, stub: true };
    }
    logger.info(`[connection-email] request notice sent to ${teacherEmail}`);
    return { sent: true };
  } catch (err) {
    logger.error(`[connection-email] request failed for ${teacherEmail}: ${err.message}`);
    return { sent: false, error: err.message };
  }
}

export async function sendConnectionApprovedEmails({
  teacherEmail,
  teacherName,
  learnerEmail,
  learnerName,
  amount,
  currency,
  teacherId,
}) {
  const results = { teacherSent: false, learnerSent: false };

  if (teacherEmail) {
    const content = buildConnectionApprovedTeacherEmail({
      teacherName,
      learnerName,
      amount,
      currency,
      dashboardUrl: `${clientBase()}/teacher#connections`,
    });
    try {
      const result = await sendMail({
        to: teacherEmail,
        subject: content.subject,
        html: content.html,
        text: content.text,
      });
      results.teacherSent = !result.stub;
      if (result.stub) logger.warn('[connection-email] SMTP stub (teacher approve)', { to: teacherEmail });
      else logger.info(`[connection-email] approve notice sent to teacher ${teacherEmail}`);
    } catch (err) {
      logger.error(`[connection-email] teacher approve failed: ${err.message}`);
    }
  }

  if (learnerEmail) {
    const content = buildConnectionApprovedLearnerEmail({
      learnerName,
      teacherName,
      amount,
      currency,
      payUrl: teacherId ? `${clientBase()}/tutors/${teacherId}` : `${clientBase()}/tutors`,
    });
    try {
      const result = await sendMail({
        to: learnerEmail,
        subject: content.subject,
        html: content.html,
        text: content.text,
      });
      results.learnerSent = !result.stub;
      if (result.stub) logger.warn('[connection-email] SMTP stub (learner approve)', { to: learnerEmail });
      else logger.info(`[connection-email] approve notice sent to learner ${learnerEmail}`);
    } catch (err) {
      logger.error(`[connection-email] learner approve failed: ${err.message}`);
    }
  }

  return results;
}
