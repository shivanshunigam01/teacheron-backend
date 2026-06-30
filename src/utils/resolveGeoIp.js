import { getClientIp } from './getClientIp.js';
import { isPublicIp } from './isPublicIp.js';

/**
 * Prefer an explicit ?ip= from the browser (ipify) so VPN/split-tunnel matches Google.
 * Falls back to the connection IP from proxy headers.
 */
export function resolveGeoLookupIp(req) {
  const queryIp = String(req.query.ip ?? req.query.lookupIp ?? '').trim();
  if (queryIp && isPublicIp(queryIp)) {
    return { ip: queryIp, source: 'client-reported' };
  }

  const connectionIp = getClientIp(req);
  if (connectionIp && isPublicIp(connectionIp)) {
    return { ip: connectionIp, source: 'connection' };
  }

  return { ip: null, source: 'none' };
}
