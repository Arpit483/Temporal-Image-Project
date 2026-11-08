import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  label?: string;
  size?: number;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  label = 'Loading...',
  size = 24,
  className = '',
}) => {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center p-8 gap-3 text-[var(--ff-text-secondary)] ${className}`}
    >
      <Loader2 size={size} className="animate-spin text-[var(--ff-accent)]" aria-hidden="true" />
      <span className="text-xs font-mono">{label}</span>
    </div>
  );
};

export default LoadingSpinner;
