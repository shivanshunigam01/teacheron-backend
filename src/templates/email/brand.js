import env from '../../config/env.js';

/** Public URL for logo in emails (must be reachable by Gmail/Outlook servers). */
export function getBrandLogoUrl() {
  if (process.env.MAIL_LOGO_URL?.trim()) {
    return process.env.MAIL_LOGO_URL.trim();
  }

  const client = env.clientUrl.replace(/\/$/, '');
  if (env.NODE_ENV === 'production' || !client.includes('localhost')) {
    return `${client}/teacherspoints-logo.png`;
  }

  const api = env.API_BASE_URL.replace(/\/api\/v1\/?$/i, '').replace(/\/$/, '');
  return `${api}/assets/email/teacherspoints-logo.png`;
}

export function getCoursesCatalogUrl() {
  return `${env.clientUrl.replace(/\/$/, '')}/courses`;
}

export function getCourseDetailUrl(course) {
  const base = env.clientUrl.replace(/\/$/, '');
  const id = course?.id || course?._id?.toString?.();
  if (id) return `${base}/courses/${encodeURIComponent(id)}`;
  if (course?.slug) return `${base}/courses/${encodeURIComponent(course.slug)}`;
  return `${base}/courses`;
}
