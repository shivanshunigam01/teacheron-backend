import nodemailer from 'nodemailer';
import env from '../config/env.js';
import logger from '../config/logger.js';

let cachedTransport = null;
let verifyPromise = null;

function isSmtpConfigured() {
  return Boolean(env.smtp.user && env.smtp.pass);
}

function buildTransportOptions() {
  const { host, port, secure, user, pass } = env.smtp;

  // Gmail: use well-tested defaults (STARTTLS on 587)
  if (host?.includes('gmail.com')) {
    return {
      service: 'gmail',
      auth: { user, pass },
    };
  }

  return {
    host,
    port,
    secure,
    auth: { user, pass },
    connectionTimeout: 20_000,
    greetingTimeout: 20_000,
    socketTimeout: 30_000,
    tls: { minVersion: 'TLSv1.2' },
  };
}

function getTransport() {
  if (!isSmtpConfigured()) return null;
  if (!cachedTransport) {
    cachedTransport = nodemailer.createTransport(buildTransportOptions());
  }
  return cachedTransport;
}

/** Call on server start — logs whether SMTP is ready. */
export async function verifySmtpConnection() {
  if (!isSmtpConfigured()) {
    logger.warn(
      'SMTP not configured (set SMTP_USER and SMTP_PASS in backend/.env). Welcome emails will be skipped.',
    );
    return { ok: false, reason: 'not_configured' };
  }

  if (!verifyPromise) {
    verifyPromise = (async () => {
      try {
        const transport = getTransport();
        await transport.verify();
        logger.info(`SMTP ready — sending as ${env.smtp.fromEmail}`);
        return { ok: true };
      } catch (err) {
        cachedTransport = null;
        verifyPromise = null;
        logger.error(`SMTP verification failed: ${err.message}`);
        return { ok: false, reason: err.message };
      }
    })();
  }

  return verifyPromise;
}

/**
 * @param {{ to: string; subject: string; html: string; text?: string }} opts
 */
export async function sendMail({ to, subject, html, text }) {
  if (!isSmtpConfigured()) {
    logger.warn('[MAIL STUB] SMTP credentials missing', { to, subject });
    return { stub: true, reason: 'not_configured' };
  }

  const transport = getTransport();

  try {
    const info = await transport.sendMail({
      from: `"${env.smtp.fromName}" <${env.smtp.fromEmail}>`,
      to,
      subject,
      html,
      text: text || undefined,
    });
    logger.info(`[MAIL SENT] to=${to} id=${info.messageId}`);
    return { stub: false, messageId: info.messageId };
  } catch (err) {
    cachedTransport = null;
    verifyPromise = null;
    logger.error(`[MAIL FAILED] to=${to} — ${err.message}`);
    throw err;
  }
}
