import crypto from 'crypto';
import bcrypt from 'bcrypt';
import env from '../config/env.js';
import logger from '../config/logger.js';
import User from '../models/User.model.js';
import { sendMail } from './email.service.js';
import { sendWelcomeEmail } from './welcomeEmail.service.js';
import { buildOtpEmail } from '../templates/email/otpEmail.js';

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_LENGTH = 6;
const RESEND_COOLDOWN_MS = 60 * 1000;

function generateOtpCode() {
  return String(crypto.randomInt(100000, 999999));
}

async function hashOtp(otp) {
  return bcrypt.hash(otp, env.BCRYPT_ROUNDS);
}

/**
 * @param {import('../models/User.model.js').default} user
 * @param {string} [role] — defaults to user.role
 */
export async function issueEmailVerificationOtp(user, role = user.role) {
  const otp = generateOtpCode();
  user.emailVerificationOtpHash = await hashOtp(otp);
  user.emailVerificationExpires = new Date(Date.now() + OTP_TTL_MS);
  user.emailVerificationSentAt = new Date();
  await user.save();

  const mail = buildOtpEmail({ name: user.name, otp, role });
  try {
    const result = await sendMail({
      to: user.email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });
    if (result.stub) {
      logger.warn('[otp-email] SMTP not configured', { email: user.email });
      return { sent: false, stub: true, reason: result.reason, ...(env.NODE_ENV === 'development' ? { devOtp: otp } : {}) };
    }
    logger.info(`[otp-email] sent to ${user.email}`);
    return { sent: true, ...(env.NODE_ENV === 'development' ? { devOtp: otp } : {}) };
  } catch (err) {
    logger.error(`[otp-email] failed: ${err.message}`);
    throw err;
  }
}

/**
 * @param {import('../models/User.model.js').default} user
 * @param {string} otp
 */
export async function verifyEmailOtp(user, otp) {
  if (user.isVerified) {
    return { alreadyVerified: true };
  }
  if (!user.emailVerificationOtpHash || !user.emailVerificationExpires) {
    throw new Error('No verification code pending. Request a new one.');
  }
  if (user.emailVerificationExpires < new Date()) {
    throw new Error('Verification code expired. Request a new one.');
  }
  const ok = await bcrypt.compare(String(otp).trim(), user.emailVerificationOtpHash);
  if (!ok) {
    throw new Error('Invalid verification code');
  }

  user.isVerified = true;
  user.emailVerificationOtpHash = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();
  return { verified: true };
}

/**
 * @param {import('../models/User.model.js').default} user
 */
export async function resendEmailVerificationOtp(user) {
  if (user.isVerified) {
    return { alreadyVerified: true };
  }
  if (
    user.emailVerificationSentAt &&
    Date.now() - new Date(user.emailVerificationSentAt).getTime() < RESEND_COOLDOWN_MS
  ) {
    const waitSec = Math.ceil(
      (RESEND_COOLDOWN_MS - (Date.now() - new Date(user.emailVerificationSentAt).getTime())) / 1000,
    );
    throw new Error(`Please wait ${waitSec}s before requesting another code`);
  }
  return issueEmailVerificationOtp(user);
}

/**
 * Send welcome email once when student email is verified.
 * @param {import('../models/User.model.js').default} user
 */
export async function sendStudentWelcomeIfReady(user) {
  if (user.role !== 'student' || !user.isVerified || user.welcomeEmailSent) {
    return { sent: false, skipped: true };
  }

  try {
    const result = await sendWelcomeEmail({ name: user.name, email: user.email, role: 'student' });
    if (result.sent) {
      user.welcomeEmailSent = true;
      await user.save();
    }
    return result;
  } catch (err) {
    logger.error(`[welcome-email] student post-verify: ${err.message}`);
    return { sent: false, error: err.message };
  }
}

/**
 * Send welcome email once when tutor profile is complete.
 * @param {import('../models/User.model.js').default} user
 */
export async function sendTeacherWelcomeIfReady(user) {
  if (user.role !== 'teacher' || !user.isVerified || !user.profileComplete || user.welcomeEmailSent) {
    return { sent: false, skipped: true };
  }

  try {
    const result = await sendWelcomeEmail({ name: user.name, email: user.email, role: 'teacher' });
    if (result.sent) {
      user.welcomeEmailSent = true;
      await user.save();
    }
    return result;
  } catch (err) {
    logger.error(`[welcome-email] tutor post-profile: ${err.message}`);
    return { sent: false, error: err.message };
  }
}
