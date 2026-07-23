import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import User from '../models/User.model.js';

export const signAccess = (userId, role, email) =>
  jwt.sign({ sub: userId, role, email }, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRES });

export const signRefresh = (userId) =>
  jwt.sign({ sub: userId }, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES });

export const verifyAccess = (t) => jwt.verify(t, env.JWT_ACCESS_SECRET);
export const verifyRefresh = (t) => jwt.verify(t, env.JWT_REFRESH_SECRET);

export function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function refreshExpiresAt() {
  const raw = String(env.JWT_REFRESH_EXPIRES || '7d').trim();
  const match = raw.match(/^(\d+)([smhd])$/i);
  let ms = 7 * 24 * 60 * 60 * 1000;
  if (match) {
    const n = Number(match[1]);
    const unit = match[2].toLowerCase();
    const mult = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit];
    ms = n * mult;
  } else if (/^\d+$/.test(raw)) {
    ms = Number(raw) * 1000;
  }
  return new Date(Date.now() + ms);
}

function userIdOf(user) {
  return user._id ? String(user._id) : String(user.id);
}

/** Issue access + refresh tokens and persist the hashed refresh token. */
export async function issueTokens(user) {
  const id = userIdOf(user);
  const accessToken = signAccess(id, user.role, user.email || '');
  const refreshToken = signRefresh(id);
  const tokenHash = hashRefreshToken(refreshToken);
  const expiresAt = refreshExpiresAt();

  await User.findByIdAndUpdate(id, {
    $push: {
      refreshTokens: {
        $each: [{ token: tokenHash, expiresAt }],
        $slice: -10,
      },
    },
  });

  // Drop expired entries opportunistically
  await User.findByIdAndUpdate(id, {
    $pull: { refreshTokens: { expiresAt: { $lte: new Date() } } },
  });

  return { accessToken, refreshToken };
}

export function isStoredRefreshTokenValid(user, refreshToken) {
  const tokenHash = hashRefreshToken(refreshToken);
  const now = Date.now();
  return (user.refreshTokens || []).some(
    (entry) => entry.token === tokenHash && (!entry.expiresAt || new Date(entry.expiresAt).getTime() > now),
  );
}

/** Remove one refresh token (or all if omitted), then issue a fresh pair. */
export async function rotateRefreshToken(user, oldRefreshToken) {
  const id = userIdOf(user);
  if (oldRefreshToken) {
    await User.findByIdAndUpdate(id, {
      $pull: { refreshTokens: { token: hashRefreshToken(oldRefreshToken) } },
    });
  }
  return issueTokens(user);
}

/** Revoke one refresh token, or all sessions for the user. */
export async function revokeRefreshToken(userId, refreshToken) {
  if (!refreshToken) {
    await User.findByIdAndUpdate(userId, { $set: { refreshTokens: [] } });
    return;
  }
  await User.findByIdAndUpdate(userId, {
    $pull: { refreshTokens: { token: hashRefreshToken(refreshToken) } },
  });
}
