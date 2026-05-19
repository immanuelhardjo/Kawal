import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import pinoHttp from 'pino-http';
import { compose } from './composition.js';
import { loadEnv } from './env.js';
import { errorHandler } from './middleware/error-handler.js';
import { sessionSweepMiddleware } from './middleware/session-sweep.js';
import { requireAuth, sessionMiddleware } from './middleware/session.js';
import { aiRoutes } from './routes/ai.js';
import { authRoutes } from './routes/auth.js';
import { caseRoutes } from './routes/cases.js';
import { entityRoutes } from './routes/entities.js';
import { graphRoutes } from './routes/graph.js';
import { meRoutes } from './routes/me.js';
import { revisionRoutes } from './routes/revisions.js';
import { timelineRoutes } from './routes/timeline.js';
import { logger } from './util/logger.js';

const env = loadEnv();
const composition = compose(env);

const app = express();

app.use(
  cors({
    origin: env.WEB_ORIGIN,
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(pinoHttp({ level: process.env.LOG_LEVEL ?? 'info' }));
app.use(sessionMiddleware(composition));
app.use(sessionSweepMiddleware(composition));

// Public, unauthenticated routes.
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});
app.use('/auth', authRoutes(composition));

// Everything below requires a valid session.
app.use(requireAuth);
app.use('/me', meRoutes(composition))
app.use('/cases', caseRoutes(composition));
app.use('/entities', entityRoutes(composition));
app.use('/timeline', timelineRoutes(composition));
app.use('/graph', graphRoutes(composition));
app.use('/revisions', revisionRoutes(composition));
app.use('/ai', aiRoutes(composition));

app.use(errorHandler);

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, 'kawal_api_listening');
});

const shutdown = async () => {
  server.close();
  await composition.close();
};

process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
