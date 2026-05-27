import express from 'express';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import env from './config/env.js';
import logger from './config/logger.js';
import { swaggerSpec } from './config/swagger.js';
import routes from './routes/index.js';
import { apiRateLimit } from './middleware/rateLimit.middleware.js';
import { corsMiddleware } from './middleware/cors.middleware.js';
import { notFound, errorHandler } from './middleware/error.middleware.js';
import { dbState } from './config/db.js';

const app = express();

app.set('trust proxy', 1);

app.use(corsMiddleware);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(mongoSanitize());
app.use(xss());
app.use(morgan('combined', { stream: logger.stream }));
app.use(apiRateLimit);
app.use('/uploads', express.static(env.uploadDir));

app.get('/health', (req, res) =>
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    db: dbState(),
    apiPrefix: env.API_PREFIX,
    authRoutes: [
      'POST /auth/register',
      'POST /auth/login',
      'GET /auth/me',
      'PATCH /auth/profile',
    ],
  }),
);

// Production/debug convenience endpoint (ensures the frontend can verify base mounting).
// Always available at /api/v1/health regardless of env.API_PREFIX configuration.
app.get('/api/v1/health', (req, res) => res.json({ success: true, message: 'TeacherPoint API is running' }));

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Mount API routes under env.API_PREFIX, but also ensure the canonical /api/v1 prefix works.
// This prevents route-mismatch 404s when env.API_PREFIX is misconfigured on the server.
const normalizedApiPrefix = String(env.API_PREFIX || '')
  .trim()
  .replace(/\/+$/, '');
const canonicalPrefix = '/api/v1';
app.use(normalizedApiPrefix || canonicalPrefix, routes);
if (normalizedApiPrefix !== canonicalPrefix) {
  app.use(canonicalPrefix, routes);
}

app.use(notFound);
app.use(errorHandler);

export default app;
