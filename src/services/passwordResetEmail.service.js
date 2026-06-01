import env from '../config/env.js';
import logger from '../config/logger.js';
import { sendMail } from './email.service.js';
import { buildPasswordResetEmail } from '../templates/email/passwordResetEmail.js';

/**
 * Send password reset email to the address the user entered on the forgot-password form.
 * @param {{ to: string; name: string; token: string; role?: 'student' | 'teacher'; setPassword?: boolean }} params
 */
export async function sendPasswordResetEmail({ to, name, token, role = 'student', setPassword = false }) {
  const destination = String(to || '').trim().toLowerCase();
  if (!destination) {
    throw new Error('Missing recipient email for password reset');
  }

  const mail = buildPasswordResetEmail({ name, token, role, setPassword });

  try {
    const result = await sendMail({
      to: destination,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });

    if (result.stub) {
      logger.warn('[password-reset-email] SMTP not configured', { to: destination });
      return {
        sent: false,
        stub: true,
        reason: result.reason || 'not_configured',
        deliveredTo: destination,
        ...(env.NODE_ENV === 'development' ? { devResetToken: token } : {}),
      };
    }

    logger.info(`[password-reset-email] sent to ${destination}`);
    return {
      sent: true,
      deliveredTo: destination,
      ...(env.NODE_ENV === 'development' ? { devResetToken: token } : {}),
    };
  } catch (err) {
    logger.error(`[password-reset-email] failed for ${destination}: ${err.message}`);
    throw err;
  }
}

/**
 * Student/tutor accounts may receive a reset/set-password link at the email they enter.
 * Includes Google sign-in users who have not set a password yet.
 * @param {import('../models/User.model.js').default | null} user
 */
export function canSendPasswordReset(user) {
  if (!user || !['student', 'teacher'].includes(user.role)) return false;
  if (user.isActive === false) return false;
  return true;
}
