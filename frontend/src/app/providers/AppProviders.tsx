import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { ERPProvider } from '@/core/context/ERPContext';
import { isAuthenticated } from '@/shared/utils';

/** Guards a route — redirects to "/" if the user is not authenticated. */
export function RequireAuth({ children }: { children: ReactNode }) {
  return isAuthenticated() ? <>{children}</> : <Navigate to="/" replace />;
}

/** Wraps protected sections with all required context providers. */
export function ProtectedProviders({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <ERPProvider>{children}</ERPProvider>
    </RequireAuth>
  );
}
