import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { env, isProd } from '../config/env.js';

/**
 * Single shared Prisma client. Reused across the app to avoid exhausting
 * the database connection pool (important on serverless Postgres like Neon).
 * Prisma 7's client connects through the pg driver adapter.
 */
const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

export const prisma = new PrismaClient({
  adapter,
  log: isProd ? ['error'] : ['warn', 'error'],
});
