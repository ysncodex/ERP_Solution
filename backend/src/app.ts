import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { isProd } from './config/env.js';
import { corsOptions } from './config/cors.js';
import { appState } from './lib/appState.js';
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
  // CORS first so every response (including errors) can include ACAO.
  app.use(cors(corsOptions));
  app.use(
    helmet({
      // APIs must be readable from the Netlify origin. Helmet's default
      // Cross-Origin-Resource-Policy: same-origin blocks that.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan(isProd ? 'combined' : 'dev'));

  // ── Health check ─────────────────────────────────────────────────────────--
  app.get('/api/health', (_req, res) => {
    // Always 200 once Express is listening so Render routes traffic (and CORS
    // preflight) during database connect. Body.status tells the frontend when
    // queries are actually safe.
    res.json({
      status: appState.dbReady ? 'ok' : 'starting',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
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
