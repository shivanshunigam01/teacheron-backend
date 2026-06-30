import mongoose from 'mongoose';
import env from './env.js';
import logger from './logger.js';
import { describeMongoTarget, maskMongoUri } from '../utils/mongoUri.js';

export async function connectDB() {
  mongoose.set('strictQuery', true);

  const uri = env.MONGO_URI;
  logger.info(`Connecting to MongoDB — target: ${describeMongoTarget(uri)}`);
  logger.info(`Mongo URI detected: ${maskMongoUri(uri)}`);

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 15_000,
  });

  logger.info(`MongoDB connected (${mongoose.connection.host}/${mongoose.connection.name})`);
}

export function dbState() {
  return mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
}

export { maskMongoUri, describeMongoTarget };
