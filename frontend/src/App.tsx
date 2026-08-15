import { Suspense } from 'react';
import { AppRoutes } from '@/app/routes';

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800" />
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AppRoutes />
    </Suspense>
  );
}
