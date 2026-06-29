import env from '../config/env.js';
import SmtpConfig from '../models/SmtpConfig.model.js';

let cache = null;
let cacheAt = 0;
const CACHE_MS = 60_000;

/**
 * Production: set SMTP_* in server .env, OR save active config in Admin → Mail settings (MongoDB).
 * Env vars win when both SMTP_USER and SMTP_PASS are set.
 */
export async function getSmtpSettings() {
  if (env.smtp.user && env.smtp.pass) {
    return {
      source: 'env',
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      user: env.smtp.user,
      pass: env.smtp.pass,
      fromName: env.smtp.fromName,
      fromEmail: env.smtp.fromEmail,
    };
  }

  const now = Date.now();
  if (cache && now - cacheAt < CACHE_MS) return cache;

  const doc = await SmtpConfig.findOne({ isActive: true }).select('+pass').lean();
  if (!doc?.user || !doc?.pass) {
    cache = null;
    return null;
  }

  cache = {
    source: 'database',
    host: doc.host || 'smtp.gmail.com',
    port: Number(doc.port || 587),
    secure: doc.secure === true,
    user: doc.user,
    pass: String(doc.pass).replace(/\s/g, ''),
    fromName: doc.fromName || 'TeacherPoint',
    fromEmail: doc.fromEmail || doc.user,
  };
  cacheAt = now;
  return cache;
}

export function invalidateSmtpCache() {
  cache = null;
  cacheAt = 0;
}

export async function getSmtpStatus() {
  const settings = await getSmtpSettings();
  return {
    configured: Boolean(settings),
    source: settings?.source ?? null,
    fromEmail: settings?.fromEmail ?? null,
  };
}
