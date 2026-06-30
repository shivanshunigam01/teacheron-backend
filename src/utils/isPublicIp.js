/**
 * True when the value looks like a routable IPv4/IPv6 address (not loopback or RFC1918).
 */
export function isPublicIp(ip) {
  if (!ip || typeof ip !== 'string') return false;

  let value = ip.trim();
  if (value.startsWith('::ffff:')) value = value.slice(7);

  if (value === '127.0.0.1' || value === '::1' || value === 'localhost') return false;

  // IPv4
  const v4 = value.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const octets = v4.slice(1, 5).map(Number);
    if (octets.some((n) => n > 255)) return false;
    const [a, b] = octets;
    if (a === 10) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 127) return false;
    if (a === 0) return false;
    return true;
  }

  // IPv6 — reject unique local (fc/fd) and link-local (fe80)
  const lower = value.toLowerCase();
  if (lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe80')) return false;

  return value.includes(':') || value.includes('.');
}
