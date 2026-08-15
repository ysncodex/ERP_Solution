import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env, isProd } from './config/env.js';
import { errorHandler, notFound } from './middleware/error.js';
import authRoutes from './modules/auth/auth.routes.js';
import salesRoutes from './modules/sales/sales.routes.js';
import expensesRoutes from './modules/expenses/expenses.routes.js';
import reportsRoutes from './modules/reports/reports.routes.js';
import menuRoutes from './modules/menu/menu.routes.js';
import suppliersRoutes from './modules/suppliers/suppliers.routes.js';
import fundsRoutes from './modules/funds/funds.routes.js';

export function createApp() {
  const app = express();

  // ── Security & infra ───────────────────────────────────────────────────────
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan(isProd ? 'combined' : 'dev'));

  // ── Health check ─────────────────────────────────────────────────────────--
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
  });

  // ── Domain routes ────────────────────────────────────────────────────────--
  app.use('/api/auth', authRoutes);
  app.use('/api/sales', salesRoutes);
  app.use('/api/expenses', expensesRoutes);
  app.use('/api/reports', reportsRoutes);
  app.use('/api/menu', menuRoutes);
  app.use('/api/suppliers', suppliersRoutes);
  app.use('/api/funds', fundsRoutes);

  // ── Fallbacks ──────────────────────────────────────────────────────────────
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
