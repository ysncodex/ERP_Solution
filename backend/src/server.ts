import { createApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './lib/prisma.js';

async function main() {
  // Verify the database connection before accepting traffic.
  await prisma.$connect();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    if (env.NODE_ENV !== 'production') {
      console.log(`ERP_Solutions API listening on http://localhost:${env.PORT}`);
      console.log(`Health: http://localhost:${env.PORT}/api/health`);
    }
  });

  const shutdown = async (signal: string) => {
    if (env.NODE_ENV !== 'production') {
      console.log(`${signal} received — shutting down gracefully...`);
    }
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch(async (err) => {
  console.error('Fatal startup error:', err);
  await prisma.$disconnect();
  process.exit(1);
});
