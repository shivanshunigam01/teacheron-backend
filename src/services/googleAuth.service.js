import { OAuth2Client } from 'google-auth-library';
import env from '../config/env.js';
import logger from '../config/logger.js';
import { ApiError } from '../utils/ApiError.js';

let client;

function maskClientId(id) {
  if (!id) return '(not set)';
  if (id.length < 24) return '(invalid format)';
  return `${id.slice(0, 12)}...${id.slice(-24)}`;
}

function getOAuthClient() {
  if (!env.googleClientId) {
    logger.error('[google-auth] GOOGLE_CLIENT_ID is missing — set it in backend .env');
    throw new ApiError(500, 'Google sign-in is not configured. Set GOOGLE_CLIENT_ID in .env');
  }
  if (!client) {
    client = new OAuth2Client(env.googleClientId);
    logger.info(`[google-auth] OAuth2Client initialized (client ID: ${maskClientId(env.googleClientId)})`);
  }
  return client;
}

/**
 * Verify a Google ID token from the frontend GIS credential.
 * @param {string} credential
 * @returns {Promise<{ googleId: string; email: string; name: string; picture: string; emailVerified: boolean }>}
 */
export async function verifyGoogleCredential(credential) {
  if (!credential || typeof credential !== 'string' || credential.length < 10) {
    logger.warn('[google-auth] Invalid credential received (missing or too short)');
    throw ApiError.badRequest('Google credential is required');
  }

  if (!env.googleClientId) {
    logger.error('[google-auth] GOOGLE_CLIENT_ID is not configured');
    throw new ApiError(500, 'Google sign-in is not configured. Set GOOGLE_CLIENT_ID in .env');
  }

  let payload;
  try {
    const ticket = await getOAuthClient().verifyIdToken({
      idToken: credential,
      audience: env.googleClientId,
    });
    payload = ticket.getPayload();
  } catch (err) {
    const msg = err?.message || String(err);
    logger.warn(`[google-auth] Token verification failed: ${msg}`);

    if (/audience/i.test(msg)) {
      logger.warn(
        `[google-auth] Audience mismatch — backend expects ${maskClientId(env.googleClientId)}. ` +
          'Ensure VITE_GOOGLE_CLIENT_ID matches GOOGLE_CLIENT_ID.',
      );
    }
    if (/invalid token/i.test(msg) || /Wrong number of segments/i.test(msg)) {
      logger.warn('[google-auth] Malformed or expired ID token');
    }

    throw ApiError.unauthorized('Invalid or expired Google token');
  }

  const tokenAud = payload?.aud;
  if (tokenAud && tokenAud !== env.googleClientId) {
    logger.warn(
      `[google-auth] Token audience "${maskClientId(String(tokenAud))}" does not match ` +
        `GOOGLE_CLIENT_ID "${maskClientId(env.googleClientId)}"`,
    );
    throw ApiError.unauthorized('Google token audience mismatch');
  }

  const email = payload?.email?.toLowerCase();
  const sub = payload?.sub;

  if (!email || !sub) {
    logger.warn('[google-auth] Token payload missing email or sub');
    throw ApiError.badRequest('Google token is missing required profile fields (email, sub)');
  }

  return {
    googleId: sub,
    email,
    name: payload.name?.trim() || email.split('@')[0],
    picture: payload.picture || '',
    emailVerified: payload.email_verified === true,
  };
}

export function getGoogleAuthStatus() {
  return {
    configured: Boolean(env.googleClientId),
    clientIdSuffix: env.googleClientId ? maskClientId(env.googleClientId) : null,
  };
}
