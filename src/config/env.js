import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Always load backend/.env regardless of process cwd (fixes missing SMTP when started from repo root)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const required = ['MONGO_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
if (process.env.NODE_ENV === 'production') {
  required.forEach((k) => {
    if (!process.env[k]) throw new Error(`Missing env ${k}`);
  });
}

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT || 5000),
  API_BASE_URL: process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 5000}`,
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  API_PREFIX: process.env.API_PREFIX || '/api/v1',
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/teacherpoint',
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'dev_access_secret_change_me_32_chars',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_change_me_32_chars',
  JWT_ACCESS_EXPIRES: process.env.JWT_ACCESS_EXPIRES || '15m',
  JWT_REFRESH_EXPIRES: process.env.JWT_REFRESH_EXPIRES || '7d',
  BCRYPT_ROUNDS: Number(process.env.BCRYPT_ROUNDS || 10),
  corsOrigins: (process.env.CORS_ORIGINS || process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim()),
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  maxFileSizeMb: Number(process.env.MAX_FILE_SIZE_MB || 10),
  geoapifyApiKey: process.env.GEOAPIFY_API_KEY || '',
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 900000),
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX || 200),
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE) === 'true',
    user: process.env.SMTP_USER?.trim() || '',
    pass: process.env.SMTP_PASS?.replace(/\s/g, '') || '',
    fromName: process.env.MAIL_FROM_NAME || 'TeachersPoints',
    fromEmail: process.env.MAIL_FROM_EMAIL || process.env.SMTP_USER || 'no-reply@teacherpoint.com',
  },
  clientUrl:
    process.env.CLIENT_URL ||
    (process.env.NODE_ENV === 'production' ? 'https://www.teacherpoint.in' : 'http://localhost:5173'),
};

export default env;
