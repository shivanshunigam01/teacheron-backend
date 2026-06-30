import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendEnvPath = path.resolve(__dirname, '../../.env');

/** Load backend/.env first; fall back to cwd .env if MONGO_URI still missing. */
const primary = dotenv.config({ path: backendEnvPath });
if (!process.env.MONGO_URI?.trim() && !process.env.MONGODB_URI?.trim() && !process.env.DATABASE_URL?.trim()) {
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });
}

export const ENV_FILE_PATH = backendEnvPath;
export const ENV_FILE_LOADED = !primary.error;

/** Resolve MongoDB URI from supported env var names (no localhost fallback). */
export function resolveMongoUri() {
  const uri =
    process.env.MONGO_URI?.trim() ||
    process.env.MONGODB_URI?.trim() ||
    process.env.DATABASE_URL?.trim();

  if (!uri) {
    throw new Error(
      'MONGO_URI is required. Set it in backend/.env or the environment (e.g. MongoDB Atlas connection string). ' +
        `Checked: ${backendEnvPath}${primary.error ? ` (not found: ${primary.error.message})` : ''}`,
    );
  }

  if (/localhost|127\.0\.0\.1/i.test(uri) && process.env.NODE_ENV === 'production') {
    throw new Error(
      'MONGO_URI points to localhost in production. Use your MongoDB Atlas connection string.',
    );
  }

  return uri;
}

const required = ['MONGO_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
if (process.env.NODE_ENV === 'production') {
  required.forEach((k) => {
    if (k === 'MONGO_URI') {
      resolveMongoUri();
      return;
    }
    if (!process.env[k]) throw new Error(`Missing env ${k}`);
  });
}

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT || 5000),
  API_BASE_URL: process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 5000}`,
  /** Public origin for uploaded assets — e.g. https://api.teacherpoint.org (no /api/v1). */
  BASE_URL:
    process.env.BASE_URL ||
    (process.env.API_BASE_URL || '').replace(/\/api\/v1\/?$/i, '').replace(/\/$/, '') ||
    `http://localhost:${process.env.PORT || 5000}`,
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  API_PREFIX: process.env.API_PREFIX || '/api/v1',
  MONGO_URI: resolveMongoUri(),
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
    fromName: process.env.MAIL_FROM_NAME || 'TeacherPoint',
    fromEmail: process.env.MAIL_FROM_EMAIL || process.env.SMTP_USER || 'no-reply@teacherpoint.org',
  },
  googleClientId: process.env.GOOGLE_CLIENT_ID?.trim() || '',
  cloudinaryUrl: process.env.CLOUDINARY_URL?.trim() || '',
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME?.trim() || '',
  clientUrl:
    process.env.CLIENT_URL ||
    (process.env.NODE_ENV === 'production' ? 'https://www.teacherpoint.org' : 'http://localhost:5173'),
  aisensy: {
    apiEndpoint: process.env.AISENSY_API_ENDPOINT?.trim() || 'https://backend.aisensy.com/campaign/t1/api/v2',
    apiKey: process.env.AISENSY_API_KEY?.trim() || '',
    campaignName: process.env.AISENSY_CAMPAIGN_NAME?.trim() || '',
    templateName: process.env.AISENSY_TEMPLATE_NAME?.trim() || '',
    channel: process.env.AISENSY_CHANNEL?.trim() || 'WhatsApp',
    userName: process.env.AISENSY_USER_NAME?.trim() || 'TeacherPoint',
    source: process.env.AISENSY_SOURCE?.trim() || 'auth-otp',
    otpParamKey: process.env.AISENSY_OTP_PARAM_KEY?.trim() || 'FirstName',
    templateParamsJson: process.env.AISENSY_TEMPLATE_PARAMS_JSON?.trim() || '',
    paramsFallbackJson: process.env.AISENSY_PARAMS_FALLBACK_JSON?.trim() || '',
    buttonsJson: process.env.AISENSY_BUTTONS_JSON?.trim() || '',
    useCopyCodeButton: String(process.env.AISENSY_USE_COPY_CODE_BUTTON ?? 'true') === 'true',
  },
  whatsappOtp: {
    length: Number(process.env.OTP_LENGTH || 6),
    expiryMinutes: Number(process.env.OTP_EXPIRY_MINUTES || 5),
    resendSeconds: Number(process.env.OTP_RESEND_SECONDS || 60),
    maxAttempts: Number(process.env.OTP_MAX_ATTEMPTS || 5),
    lockMinutes: Number(process.env.OTP_LOCK_MINUTES || 15),
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID?.trim() || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET?.trim() || '',
  },
};

export default env;
