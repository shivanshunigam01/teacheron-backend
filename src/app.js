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
  res.json({ status: 'ok', uptime: process.uptime(), db: dbState() }),
);

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use(env.API_PREFIX, routes);
app.use(notFound);
app.use(errorHandler);

export default app;
