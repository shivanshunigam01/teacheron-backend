import nodemailer from 'nodemailer';
import logger from '../config/logger.js';
import { getSmtpSettings, invalidateSmtpCache } from './smtpConfig.service.js';

let cachedTransport = null;
let cachedTransportKey = '';
let verifyPromise = null;

function transportKey(settings) {
  return `${settings.host}:${settings.port}:${settings.user}:${settings.secure}`;
}

function buildTransportOptions(settings) {
  const { host, port, secure, user, pass } = settings;

  if (host?.includes('gmail.com') || user?.includes('@gmail.com')) {
    return { service: 'gmail', auth: { user, pass } };
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

async function getTransport() {
  const settings = await getSmtpSettings();
  if (!settings) return { transport: null, settings: null };

  const key = transportKey(settings);
  if (!cachedTransport || cachedTransportKey !== key) {
    cachedTransport = nodemailer.createTransport(buildTransportOptions(settings));
    cachedTransportKey = key;
  }

  return { transport: cachedTransport, settings };
}

function resetTransport() {
  cachedTransport = null;
  cachedTransportKey = '';
  verifyPromise = null;
  invalidateSmtpCache();
}

/** Call on server start — logs whether SMTP is ready (env or database). */
export async function verifySmtpConnection() {
  const settings = await getSmtpSettings();
  if (!settings) {
    logger.warn(
      'SMTP not configured. Set SMTP_USER/SMTP_PASS in server .env or Admin → Mail settings. Welcome emails disabled.',
    );
    return { ok: false, reason: 'not_configured' };
  }

  if (!verifyPromise) {
    verifyPromise = (async () => {
      try {
        const { transport } = await getTransport();
        await transport.verify();
        logger.info(
          `SMTP ready (${settings.source}) — sending as ${settings.fromEmail}`,
        );
        return { ok: true, source: settings.source };
      } catch (err) {
        resetTransport();
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
  const { transport, settings } = await getTransport();

  if (!transport || !settings) {
    logger.warn('[MAIL STUB] SMTP not configured', { to, subject });
    return { stub: true, reason: 'not_configured' };
  }

  try {
    const info = await transport.sendMail({
      from: `"${settings.fromName}" <${settings.fromEmail}>`,
      to,
      subject,
      html,
      text: text || undefined,
    });
    logger.info(`[MAIL SENT] to=${to} id=${info.messageId}`);
    return { stub: false, messageId: info.messageId };
  } catch (err) {
    resetTransport();
    logger.error(`[MAIL FAILED] to=${to} — ${err.message}`);
    throw err;
  }
}
