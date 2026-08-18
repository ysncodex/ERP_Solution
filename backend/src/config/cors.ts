import type { CorsOptions } from 'cors';
import { env } from './env.js';

/** Live Netlify site — always allowed so a missing Render env var cannot break production. */
const PRODUCTION_FRONTEND = 'https://erpasolutions.netlify.app';

const LOCAL_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:4173',
];

function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, '');
}

function envOrigins(): string[] {
  return env.CORS_ORIGIN.split(',').map(normalizeOrigin).filter(Boolean);
}

const ALLOWED = new Set(
  [PRODUCTION_FRONTEND, ...LOCAL_ORIGINS, ...envOrigins()].map((o) => o.toLowerCase()),
);

/** Netlify deploy previews for this site, e.g. https://123--erpasolutions.netlify.app */
const NETLIFY_PREVIEW = /^https:\/\/([a-z0-9-]+--)?erpasolutions\.netlify\.app$/i;

export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  const normalized = normalizeOrigin(origin);
  if (ALLOWED.has(normalized.toLowerCase())) return true;
  return NETLIFY_PREVIEW.test(normalized);
}

export const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }
    // Deny without throwing — a thrown error skips CORS headers and looks like a
    // preflight failure ("No Access-Control-Allow-Origin header").
    callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
};
