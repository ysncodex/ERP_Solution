import { forwardRef } from 'react';
import type { ButtonProps } from './Button.types';
import { Loader2 } from 'lucide-react';

const variantStyles = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg',
  secondary: 'bg-slate-600 text-white hover:bg-slate-700 shadow-lg',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 shadow-lg',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg',
  outline: 'border-2 border-slate-300 text-slate-700 hover:bg-slate-50'
};

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2.5 text-base',
  lg: 'px-6 py-3 text-lg'
};

/**
 * Button Component
 * Reusable button with multiple variants and loading state
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    children, 
    variant = 'primary', 
    size = 'md', 
    loading = false, 
    icon, 
    fullWidth = false,
    disabled,
    className = '',
    ...props 
  }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${fullWidth ? 'w-full' : ''}
          ${className}
          rounded-lg font-bold 
          transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          flex items-center justify-center gap-2
        `}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin" size={16} />
            <span>Loading...</span>
          </>
        ) : (
          <>
            {icon && <span>{icon}</span>}
            {children}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
