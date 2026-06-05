import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
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
import { corsMiddleware, corsOptions } from './middleware/cors.middleware.js';
import { notFound, errorHandler } from './middleware/error.middleware.js';
import { dbState } from './config/db.js';
import { getSmtpStatus } from './services/smtpConfig.service.js';
import { getGoogleAuthStatus } from './services/googleAuth.service.js';
import { getEmailClientUrl } from './templates/email/brand.js';

const app = express();
const API_PREFIX = '/api/v1';

app.set('trust proxy', 1);

// CORS — handled only here (nginx must NOT add Access-Control-* headers)
app.use(corsMiddleware);
app.options('*', cors(corsOptions));

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
app.use(
  '/assets/email',
  express.static(path.join(path.dirname(fileURLToPath(import.meta.url)), '../assets/email')),
);

app.get('/health', async (req, res) => {
  const smtp = await getSmtpStatus();
  res.json({
    success: true,
    status: 'ok',
    uptime: process.uptime(),
    db: dbState(),
    smtp,
    emailLinksBase: getEmailClientUrl(),
    geo: {
      configured: Boolean(env.geoapifyApiKey),
      endpoints: ['GET /api/v1/geo/ip', 'GET /api/v1/geo/reverse'],
    },
    cms: {
      banners: 'GET /api/v1/banners/active?country=&city=&countryCode=',
      admin: 'GET/POST/PATCH/DELETE /api/v1/admin/banners',
    },
    apiPrefix: API_PREFIX,
    authRoutes: [
      'POST /api/v1/auth/register',
      'POST /api/v1/auth/verify-email',
      'POST /api/v1/auth/resend-verification',
      'POST /api/v1/auth/login',
      'POST /api/v1/auth/google-login',
      'GET /api/v1/auth/me',
      'PATCH /api/v1/auth/profile',
    ],
    googleAuth: getGoogleAuthStatus(),
    welcomeEmail: 'Sent on student/teacher signup when SMTP is configured',
  });
});

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Always mount API routes at the canonical /api/v1 prefix used by the frontend.
app.use(API_PREFIX, routes);

if (env.API_PREFIX && env.API_PREFIX.replace(/\/+$/, '') !== API_PREFIX) {
  logger.warn(`API_PREFIX env is "${env.API_PREFIX}" — routes are mounted at ${API_PREFIX}`);
}

app.use(notFound);
app.use(errorHandler);

export default app;
