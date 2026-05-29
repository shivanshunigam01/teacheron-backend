import { ApiError } from '../utils/ApiError.js';
import * as tokenService from '../services/token.service.js';
import User from '../models/User.model.js';

function readBearerToken(req) {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return null;
  const token = h.slice(7).trim();
  return token || null;
}

function attachUserFromToken(req, token) {
  try {
    const p = tokenService.verifyAccess(token);
    req.user = { id: p.sub, role: p.role, email: p.email };
    return true;
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Session expired — please log in again');
    }
    if (err.name === 'JsonWebTokenError') {
      throw ApiError.unauthorized('Invalid session — please log in again');
    }
    throw err;
  }
}

export const verifyJWT = async (req, res, next) => {
  try {
    const token = readBearerToken(req);
    if (!token) throw ApiError.unauthorized();
    attachUserFromToken(req, token);
    const user = await User.findById(req.user.id).select('isActive');
    if (!user?.isActive) throw ApiError.forbidden('Account is disabled');
    next();
  } catch (err) {
    next(err);
  }
};

export const optionalJWT = (req, res, next) => {
  const token = readBearerToken(req);
  if (token) attachUserFromToken(req, token);
  next();
};

export const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) throw ApiError.forbidden();
    next();
  };
