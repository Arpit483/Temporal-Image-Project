import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Execution Error',
  message,
  onRetry,
  className = '',
}) => {
  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center p-6 text-center rounded border border-[var(--ff-error)] bg-[var(--ff-error-bg)] max-w-md mx-auto my-6 ${className}`}
    >
      <AlertCircle size={28} className="text-[var(--ff-error)] mb-2" aria-hidden="true" />
      <h3 className="text-sm font-semibold text-[var(--ff-text)]">{title}</h3>
      {message && <p className="text-xs text-[var(--ff-text-secondary)] font-mono mt-1 mb-4">{message}</p>}
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-mono font-medium rounded bg-[var(--ff-panel)] hover:bg-[var(--ff-workspace)] text-[var(--ff-text)] border border-[var(--ff-border)] transition-colors"
        >
          <RefreshCw size={13} />
          Retry
        </button>
      )}
    </div>
  );
};

export default ErrorState;
