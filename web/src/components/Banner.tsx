import React from 'react';
import { AlertTriangle } from 'lucide-react';

export const Banner: React.FC = () => {
  return (
    <div
      role="alert"
      aria-live="polite"
      className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium tracking-wide text-center border-b transition-colors"
      style={{
        backgroundColor: 'var(--ff-synthetic-bg)',
        borderBottomColor: 'var(--ff-border)',
        color: 'var(--ff-synthetic)',
      }}
    >
      <AlertTriangle size={14} className="shrink-0" aria-hidden="true" />
      <span>Synthetic frames are model output, not observations. Not for forecasting or retrievals.</span>
    </div>
  );
};

export default Banner;
