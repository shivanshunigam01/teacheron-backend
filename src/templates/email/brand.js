import env from '../../config/env.js';

export const PRODUCTION_CLIENT = 'https://www.teacherpoint.in';
export const PRODUCTION_API = 'https://api.teacherpoint.in';

function stripTrailingSlash(url) {
  return url.replace(/\/$/, '');
}

function isLocalhostUrl(url) {
  return /localhost|127\.0\.0\.1/i.test(url || '');
}

function isProductionDeployment() {
  if (env.NODE_ENV === 'production') return true;

  const api = (env.API_BASE_URL || process.env.API_BASE_URL || '').trim();
  const cors = process.env.CORS_ORIGINS || '';
  const client = process.env.CLIENT_URL || '';

  return (
    /teacherpoint\.in/i.test(api) ||
    /teacherpoint\.in/i.test(cors) ||
    /teacherpoint\.in/i.test(client)
  );
}

/**
 * Public site URL for links inside transactional emails.
 * Never uses localhost when deployed or when real SMTP sends mail (unless MAIL_ALLOW_LOCAL_URLS=true).
 */
export function getEmailClientUrl() {
  const mailOverride = process.env.MAIL_CLIENT_URL?.trim();
  if (mailOverride) return stripTrailingSlash(mailOverride);

  const client = env.clientUrl ? stripTrailingSlash(env.clientUrl) : '';

  if (isProductionDeployment()) return PRODUCTION_CLIENT;

  if (client && !isLocalhostUrl(client)) return client;

  const smtpConfigured = Boolean(process.env.SMTP_USER?.trim() || env.smtp?.user?.trim());
  if (smtpConfigured && process.env.MAIL_ALLOW_LOCAL_URLS !== 'true') {
    return PRODUCTION_CLIENT;
  }

  return client || PRODUCTION_CLIENT;
}

/** API origin for uploaded assets in emails (course images, etc.). */
export function getEmailApiBaseUrl() {
  if (process.env.MAIL_API_URL?.trim()) {
    return stripTrailingSlash(process.env.MAIL_API_URL.trim());
  }

  const api = (env.API_BASE_URL || process.env.API_BASE_URL || '').trim();
  const bare = api.replace(/\/api\/v1\/?$/i, '').replace(/\/$/, '');

  if (/teacherpoint\.in/i.test(bare)) return PRODUCTION_API;
  if (bare && !isLocalhostUrl(bare)) return bare;
  if (isProductionDeployment()) return PRODUCTION_API;

  const smtpConfigured = Boolean(process.env.SMTP_USER?.trim() || env.smtp?.user?.trim());
  if (smtpConfigured && process.env.MAIL_ALLOW_LOCAL_URLS !== 'true') {
    return PRODUCTION_API;
  }

  return bare || PRODUCTION_API;
}

/** Rewrite localhost or relative upload URLs so images load in Gmail/Outlook. */
export function normalizeEmailAssetUrl(url) {
  if (!url?.trim()) return '';
  const u = url.trim();

  if (/^https?:\/\//i.test(u)) {
    if (isLocalhostUrl(u)) {
      const path = u.replace(/^https?:\/\/[^/]+/i, '') || '/';
      return `${getEmailApiBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
    }
    return u;
  }

  if (u.startsWith('/')) return `${getEmailApiBaseUrl()}${u}`;
  return `${getEmailApiBaseUrl()}/${u}`;
}

/** Public URL for logo in emails (must be reachable by Gmail/Outlook servers). */
export function getBrandLogoUrl() {
  if (process.env.MAIL_LOGO_URL?.trim()) {
    return process.env.MAIL_LOGO_URL.trim();
  }

  return `${getEmailClientUrl()}/teacherspoints-logo.png`;
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

export function getResetPasswordUrl(token) {
  return `${getEmailClientUrl()}/reset-password?token=${encodeURIComponent(token)}`;
}

export function getProfileUrl() {
  return `${getEmailClientUrl()}/profile`;
}

export function getTeacherDashboardUrl() {
  return `${getEmailClientUrl()}/teacher`;
}
