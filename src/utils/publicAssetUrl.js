import env from '../config/env.js';

function stripTrailingSlash(url) {
  return String(url || '').replace(/\/$/, '');
}

/** Public API origin for uploaded assets (no /api/v1 suffix). */
export function getPublicBaseUrl(req) {
  const fromEnv = stripTrailingSlash(process.env.BASE_URL || env.BASE_URL || '');
  if (fromEnv) return fromEnv;

  let base = stripTrailingSlash(
    (env.API_BASE_URL || process.env.API_BASE_URL || '').replace(/\/api\/v1\/?$/i, ''),
  );

  if (req) {
    const host = req.get('x-forwarded-host') || req.get('host');
    const proto = (req.get('x-forwarded-proto') || req.protocol || 'https').split(',')[0].trim();
    if (host && !/localhost|127\.0\.0\.1/i.test(host)) {
      return `${proto}://${host}`;
    }
  }

  return base;
}

/** Filename segment from a stored path or URL. */
export function extractApprovedImage(stored) {
  const u = String(stored || '').trim();
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) {
    try {
      return decodeURIComponent(new URL(u).pathname.split('/').pop() || u);
    } catch {
      return u.split('/').pop() || u;
    }
  }
  return u.replace(/\\/g, '/').split('/').pop() || u;
}

/** Resolve a stored filename or relative uploads path to a public HTTPS URL. */
export function resolveApprovedImageUrl(stored, req) {
  const u = String(stored || '').trim();
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;

  const base = getPublicBaseUrl(req);
  if (!base) return u.startsWith('/') ? u : `/${u}`;

  if (u.startsWith('/')) return `${base}${u}`;

  const normalized = u.replace(/\\/g, '/');
  if (normalized.startsWith('uploads/')) return `${base}/${normalized}`;
  if (normalized.includes('/')) return `${base}/${normalized}`;

  return `${base}/uploads/approved/${normalized}`;
}

/**
 * Append approvedImage + approvedImageUrl without removing existing fields.
 * @param {Record<string, unknown>} obj
 * @param {import('express').Request} [req]
 * @param {string} [sourceField]
 */
export function enrichApprovedImageFields(obj, req, sourceField = 'imageUrl') {
  if (!obj || typeof obj !== 'object') return obj;

  const raw = String(obj.approvedImage || obj[sourceField] || '').trim();
  const approvedImage = obj.approvedImage || extractApprovedImage(raw) || undefined;
  const approvedImageUrl =
    resolveApprovedImageUrl(obj.approvedImage || obj[sourceField], req) || undefined;

  return {
    ...obj,
    ...(approvedImage ? { approvedImage } : {}),
    ...(approvedImageUrl ? { approvedImageUrl } : {}),
  };
}
