import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: number;
  className?: string;
}

/**
 * LoadingSpinner Component
 * Animated loading indicator
 */
export function LoadingSpinner({ size = 24, className = '' }: LoadingSpinnerProps) {
  return (
    <Loader2 
      size={size} 
      className={`animate-spin text-slate-400 ${className}`} 
    />
  );
}
