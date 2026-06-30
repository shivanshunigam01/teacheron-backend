import mongoose from 'mongoose';
import app from './app.js';
import { connectDB } from './config/db.js';
import env, { ENV_FILE_LOADED, ENV_FILE_PATH } from './config/env.js';
import logger from './config/logger.js';
import { maskMongoUri } from './utils/mongoUri.js';
import { verifySmtpConnection } from './services/email.service.js';
import { initCloudinary, isCloudinaryConfigured } from './services/cloudinary.service.js';
import { getGoogleAuthStatus } from './services/googleAuth.service.js';

logger.info(`Starting TeacherPoint API — NODE_ENV=${env.NODE_ENV} PORT=${env.PORT}`);
logger.info(`Env file: ${ENV_FILE_PATH} (${ENV_FILE_LOADED ? 'loaded' : 'not found — using process env'})`);
logger.info(
  `MONGO_URI defined: ${Boolean(
    process.env.MONGO_URI?.trim() || process.env.MONGODB_URI?.trim() || process.env.DATABASE_URL?.trim(),
  )}`,
);
logger.info(`Mongo URI detected: ${maskMongoUri(env.MONGO_URI)}`);

await connectDB();
await verifySmtpConnection();
if (isCloudinaryConfigured()) {
  initCloudinary();
} else {
  logger.warn('Cloudinary not configured — profile images will use local uploads folder');
}

const server = app.listen(env.PORT, () => {
  logger.info(`API running on ${env.API_BASE_URL}/api/v1`);
  logger.info('Auth routes: POST /api/v1/auth/register, POST /api/v1/auth/login, GET /api/v1/auth/me');
  logger.info('Health: GET /api/v1/health and GET /health');

  const google = getGoogleAuthStatus();
  if (google.configured) {
    logger.info(`Google OAuth configured (GOOGLE_CLIENT_ID: ${google.clientIdSuffix})`);
  } else {
    logger.warn('Google OAuth NOT configured — set GOOGLE_CLIENT_ID in backend .env (must match VITE_GOOGLE_CLIENT_ID)');
  }
});

const shutdown = (signal) => {
  logger.info(`${signal} received`);
  server.close(async () => {
    try {
      await mongoose.connection.close();
    } catch (err) {
      logger.error(err);
    }
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
