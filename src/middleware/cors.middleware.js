import cors from 'cors';
import env from '../config/env.js';

const DEFAULT_ORIGINS = [
  'https://teacherpoint.org',
  'https://www.teacherpoint.org',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

/** Allowed browser origins — defaults plus CORS_ORIGINS from backend/.env */
export const ALLOWED_ORIGINS = [...new Set([...DEFAULT_ORIGINS, ...env.corsOrigins])];

export const corsOptions = {
  origin(origin, callback) {
    // Allow non-browser clients (curl, Postman, server-to-server) with no Origin header
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  maxAge: 86400,
  optionsSuccessStatus: 204,
};

export const corsMiddleware = cors(corsOptions);

export default corsMiddleware;
