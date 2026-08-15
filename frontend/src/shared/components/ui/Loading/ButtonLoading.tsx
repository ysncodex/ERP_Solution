import type { ReactNode } from 'react';
import { LoadingSpinner } from './Spinner';

interface ButtonLoadingProps {
  children: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

/**
 * ButtonLoading Component
 * Button with integrated loading state
 */
export function ButtonLoading({ 
  children, 
  loading = false, 
  disabled = false,
  className = '',
  onClick,
  type = 'button'
}: ButtonLoadingProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`relative ${className} ${loading || disabled ? 'opacity-70 cursor-not-allowed' : ''}`}
    >
      {loading && (
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <LoadingSpinner size={20} />
        </span>
      )}
      <span className={`flex items-center gap-2 ${loading ? 'invisible' : ''}`}>{children}</span>
    </button>
  );
}
