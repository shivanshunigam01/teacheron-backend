/**
 * Resolve client IP behind proxies (Nginx, Cloudflare, Render, etc.).
 */
export function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const first = String(forwarded).split(',')[0].trim();
    if (first) return normalizeIp(first);
  }

  const cf = req.headers['cf-connecting-ip'];
  if (cf) return normalizeIp(String(cf));

  const realIp = req.headers['x-real-ip'];
  if (realIp) return normalizeIp(String(realIp));

  const socketIp = req.socket?.remoteAddress;
  if (socketIp) return normalizeIp(String(socketIp));

  if (req.ip) return normalizeIp(String(req.ip));

  return null;
}

function normalizeIp(ip) {
  if (!ip) return null;
  let value = String(ip).trim();
  if (value.startsWith('::ffff:')) value = value.slice(7);
  if (value === '::1') value = '127.0.0.1';
  return value || null;
}
