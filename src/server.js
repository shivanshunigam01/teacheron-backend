import mongoose from 'mongoose';
import app from './app.js';
import { connectDB } from './config/db.js';
import env from './config/env.js';
import logger from './config/logger.js';
import { verifySmtpConnection } from './services/email.service.js';

await connectDB();
await verifySmtpConnection();

const server = app.listen(env.PORT, () => {
  logger.info(`API running on ${env.API_BASE_URL}/api/v1`);
  logger.info('Auth routes: POST /api/v1/auth/register, POST /api/v1/auth/login, GET /api/v1/auth/me');
  logger.info('Health: GET /api/v1/health and GET /health');
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
