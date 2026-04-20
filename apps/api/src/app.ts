import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import { rateLimit } from 'express-rate-limit';

import { errorHandler } from './middleware/errorHandler';
import { requestId } from './middleware/requestId';
import { auditLogger } from './middleware/auditLogger';

import authRoutes from './routes/auth';
import patientRoutes from './routes/patients';
import moduleRoutes from './routes/modules';
import progressRoutes from './routes/progress';
import learningPlanRoutes from './routes/learningPlans';
import alertRoutes from './routes/alerts';
import chatRoutes from './routes/chat';
import messagesRoutes from './routes/messages';
import analyticsRoutes from './routes/analytics';
import vitalsRoutes from './routes/vitals';
import notificationsRoutes from './routes/notifications';
import careTeamRoutes from './routes/careTeam';
import adminRoutes from './routes/admin';

const app = express();

// ─── Health Check (before all middleware — must always respond) ───────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// ─── Security Middleware ──────────────────────────────────────────────────────

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      mediaSrc: ["'self'", 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
}));

// Global rate limit
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
}));

// ─── General Middleware ───────────────────────────────────────────────────────

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestId);
app.use(morgan('combined'));
app.use(auditLogger);

// ─── API Routes ───────────────────────────────────────────────────────────────

const v1 = '/api/v1';

app.use(`${v1}/auth`, authRoutes);
app.use(`${v1}/patients`, patientRoutes);
app.use(`${v1}/modules`, moduleRoutes);
app.use(`${v1}/progress`, progressRoutes);
app.use(`${v1}/learning-plans`, learningPlanRoutes);
app.use(`${v1}/alerts`, alertRoutes);
app.use(`${v1}/chat`, chatRoutes);
app.use(`${v1}/messages`, messagesRoutes);
app.use(`${v1}/analytics`, analyticsRoutes);
app.use(`${v1}/vitals`, vitalsRoutes);
app.use(`${v1}/notifications`, notificationsRoutes);
app.use(`${v1}/care-team`, careTeamRoutes);
app.use(`${v1}/admin`, adminRoutes);

// ─── Error Handling ───────────────────────────────────────────────────────────

app.use(errorHandler);

export default app;
