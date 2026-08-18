import { createApp } from './app.js';
import { env } from './config/env.js';
import { appState } from './lib/appState.js';
import { prisma } from './lib/prisma.js';

async function main() {
  // Listen immediately so CORS preflight (OPTIONS) succeeds while Postgres
  // is still connecting. A sleeping Render instance otherwise returns a 502
  // HTML page with no Access-Control-Allow-Origin, which the browser reports
  // as a CORS failure.
  const app = createApp();
  const server = app.listen(env.PORT, () => {
    if (env.NODE_ENV !== 'production') {
      console.log(`ERP_Solutions API listening on http://localhost:${env.PORT}`);
      console.log(`Health: http://localhost:${env.PORT}/api/health`);
    }
  });

  try {
    await prisma.$connect();
    appState.dbReady = true;
  } catch (err) {
    console.error('Database connection failed:', err);
    server.close();
    process.exit(1);
  }

  const shutdown = async (signal: string) => {
    if (env.NODE_ENV !== 'production') {
      console.log(`${signal} received — shutting down gracefully...`);
    }
    appState.dbReady = false;
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch(async (err) => {
  console.error('Fatal startup error:', err);
  appState.dbReady = false;
  await prisma.$disconnect();
  process.exit(1);
});
