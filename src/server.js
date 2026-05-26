import mongoose from 'mongoose';
import app from './app.js';
import { connectDB } from './config/db.js';
import env from './config/env.js';
import logger from './config/logger.js';

await connectDB();

const server = app.listen(env.PORT, () => {
  logger.info(`API running on ${env.API_BASE_URL}${env.API_PREFIX}`);
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
