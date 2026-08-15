import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { toast } from 'sonner';

// Base API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL;

/** Sonner toast id for the single, shared "backend waking up" notice. */
const WARMUP_TOAST_ID = 'server-warmup';

/**
 * Free-tier hosting (Render) spins the backend down after inactivity, so the
 * first request after an idle period triggers a cold start that can take
 * 30–60s (process boot + DB connection). A short timeout would fail every
 * request fired right after login. Allow a generous window instead.
 */
const DEFAULT_TIMEOUT = 45_000;

/** Automatic retry budget for transient/cold-start failures. */
const MAX_RETRIES = 4;
const BASE_RETRY_DELAY = 800; // ms — grows exponentially with jitter.
const MAX_RETRY_DELAY = 8_000; // ms — cap per-attempt backoff.

/** Per-request retry bookkeeping (attached to the axios config). */
interface RetryableConfig extends InternalAxiosRequestConfig {
  _retryCount?: number;
}

// Create axios instance with default config
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: DEFAULT_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * A failure is transient when it is caused by the backend waking up, a brief
 * network blip, or the HTTP/2 connection refusing streams while the server is
 * still starting (ERR_HTTP2_SERVER_REFUSED_STREAM / ERR_FAILED surface here as
 * a missing response). We only auto-retry safe/idempotent methods so a POST is
 * never silently duplicated.
 */
function isTransientError(error: AxiosError): boolean {
  const method = (error.config?.method ?? 'get').toLowerCase();
  const isSafeMethod = method === 'get' || method === 'head' || method === 'options';
  if (!isSafeMethod) return false;

  // No response object → timeout, connection reset, DNS/TLS hiccup, or the
  // browser aborting an HTTP/2 stream. These are exactly the cold-start cases.
  if (!error.response) return true;

  // Backend reachable but temporarily unavailable / throttled.
  const status = error.response.status;
  return status === 502 || status === 503 || status === 504 || status === 429;
}

function getRetryDelay(attempt: number): number {
  const exponential = BASE_RETRY_DELAY * 2 ** (attempt - 1);
  const jitter = Math.random() * 300; // de-synchronise the burst of retries.
  return Math.min(exponential + jitter, MAX_RETRY_DELAY);
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * A single, shared "the server is waking up" notice so the (expected) retry
 * window after a cold start reads as intentional instead of broken. Guarded by
 * a module flag so a burst of retrying requests only ever shows one toast.
 */
let isWarmingUp = false;

function notifyWarmingUp(): void {
  if (isWarmingUp) return;
  isWarmingUp = true;
  toast.loading('Waking up the server…', {
    id: WARMUP_TOAST_ID,
    description: 'This can take up to a minute on the first load. Hang tight.',
    duration: Infinity,
  });
}

function notifyWarmedUp(): void {
  if (!isWarmingUp) return;
  isWarmingUp = false;
  toast.dismiss(WARMUP_TOAST_ID);
}

// Response interceptor - unwrap data, retry transient failures, handle auth.
apiClient.interceptors.response.use(
  (response) => {
    // Any success means the backend is reachable — clear the warm-up notice.
    notifyWarmedUp();
    return response.data;
  },
  async (error: AxiosError) => {
    const config = error.config as RetryableConfig | undefined;
    const requestUrl: string = config?.url ?? '';
    const isAuthAttempt = requestUrl.includes('/auth/');

    // Ride out cold starts and transient network errors with exponential
    // backoff before surfacing a failure to the UI. This prevents the "pages
    // fail to load on the first attempt" symptom right after login.
    if (config && isTransientError(error)) {
      const attempt = (config._retryCount ?? 0) + 1;
      if (attempt <= MAX_RETRIES) {
        config._retryCount = attempt;
        // Surface the retry window as an intentional "waking up" state.
        notifyWarmingUp();
        await wait(getRetryDelay(attempt));
        return apiClient(config);
      }
    }

    // Not retrying (retries exhausted or a definitive error) — never leave the
    // warm-up toast hanging.
    notifyWarmedUp();

    // Session expired on a normal request → clear token and bounce to login.
    // ONLY a genuine 401 does this — never a network/cold-start failure — so
    // temporary backend unavailability can't force the user to log out.
    if (error.response?.status === 401 && !isAuthAttempt) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// Generic API methods
export const api = {
  get: <T>(url: string, params?: Record<string, unknown>) =>
    apiClient.get<unknown, T>(url, { params }),

  post: <T>(url: string, data?: unknown) => apiClient.post<unknown, T>(url, data),

  put: <T>(url: string, data?: unknown) => apiClient.put<unknown, T>(url, data),

  patch: <T>(url: string, data?: unknown) => apiClient.patch<unknown, T>(url, data),

  delete: <T>(url: string) => apiClient.delete<unknown, T>(url),
};
