import { OAuth2Client } from 'google-auth-library';
import env from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

let client;

function getOAuthClient() {
  if (!env.googleClientId) {
    throw ApiError.internal('Google sign-in is not configured. Set GOOGLE_CLIENT_ID in .env');
  }
  if (!client) {
    client = new OAuth2Client(env.googleClientId);
  }
  return client;
}

/**
 * Verify a Google ID token from the frontend GIS credential.
 * @param {string} credential
 * @returns {Promise<{ googleId: string; email: string; name: string; picture: string; emailVerified: boolean }>}
 */
export async function verifyGoogleCredential(credential) {
  let payload;
  try {
    const ticket = await getOAuthClient().verifyIdToken({
      idToken: credential,
      audience: env.googleClientId,
    });
    payload = ticket.getPayload();
  } catch (err) {
    throw ApiError.unauthorized('Invalid or expired Google token');
  }

  const email = payload?.email?.toLowerCase();
  const sub = payload?.sub;

  if (!email || !sub) {
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
