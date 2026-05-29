import env from '../../config/env.js';

const PRODUCTION_CLIENT = 'https://www.teacherpoint.in';

function stripTrailingSlash(url) {
  return url.replace(/\/$/, '');
}

function isLocalhostUrl(url) {
  return /localhost|127\.0\.0\.1/i.test(url || '');
}

/**
 * Public site URL for links inside transactional emails.
 * Never uses localhost when the API is deployed on teacherpoint.in.
 */
export function getEmailClientUrl() {
  const mailOverride = process.env.MAIL_CLIENT_URL?.trim();
  if (mailOverride) return stripTrailingSlash(mailOverride);

  const client = env.clientUrl ? stripTrailingSlash(env.clientUrl) : '';
  if (client && !isLocalhostUrl(client)) return client;

  const api = (env.API_BASE_URL || process.env.API_BASE_URL || '').trim();
  if (/teacherpoint\.in/i.test(api)) return PRODUCTION_CLIENT;

  if (env.NODE_ENV === 'production') return PRODUCTION_CLIENT;

  return client || 'http://localhost:5173';
}

/** Public URL for logo in emails (must be reachable by Gmail/Outlook servers). */
export function getBrandLogoUrl() {
  if (process.env.MAIL_LOGO_URL?.trim()) {
    return process.env.MAIL_LOGO_URL.trim();
  }

  const client = getEmailClientUrl();
  if (env.NODE_ENV === 'production' || !isLocalhostUrl(client)) {
    return `${client}/teacherspoints-logo.png`;
  }

  const api = env.API_BASE_URL.replace(/\/api\/v1\/?$/i, '').replace(/\/$/, '');
  return `${api}/assets/email/teacherspoints-logo.png`;
}

export function getCoursesCatalogUrl() {
  return `${getEmailClientUrl()}/courses`;
}

export function getCourseDetailUrl(course) {
  const base = getEmailClientUrl();
  const id = course?.id || course?._id?.toString?.();
  if (id) return `${base}/courses/${encodeURIComponent(id)}`;
  if (course?.slug) return `${base}/courses/${encodeURIComponent(course.slug)}`;
  return `${base}/courses`;
}

export function getVerifyEmailUrl() {
  return `${getEmailClientUrl()}/verify-email`;
}

export function getLoginUrl() {
  return `${getEmailClientUrl()}/login`;
}

export function getProfileUrl() {
  return `${getEmailClientUrl()}/profile`;
}
