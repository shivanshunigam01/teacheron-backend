import { ApiError } from '../utils/ApiError.js';
import { applyCorsHeaders } from './cors.middleware.js';

export function notFound(req, res, next) {
  next(ApiError.notFound(`Route not found: ${req.originalUrl}`));
}

export function errorHandler(err, req, res, _next) {
  applyCorsHeaders(req, res);

  let status = err.statusCode || 500;
  let message = err.message || 'Server error';
  let errors = err.errors || [];

  if (err.name === 'ValidationError') {
    status = 400;
    errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    message = 'Validation failed';
  }
  if (err.name === 'CastError') {
    status = 400;
    message = 'Invalid ID';
  }
  if (err.code === 11000) {
    status = 409;
    message = 'Duplicate field';
    errors = [{ field: Object.keys(err.keyValue || {})[0], message: 'Already exists' }];
  }

  res.status(status).json({ success: false, message, errors });
}
