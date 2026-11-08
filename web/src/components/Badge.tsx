import React from 'react';
import { FRAME_TYPE_OBSERVED, FRAME_TYPE_SYNTHETIC } from '../types';

interface BadgeProps {
  type: number; // 0 = OBSERVED, 1 = SYNTHETIC
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ type, className = '' }) => {
  if (type === FRAME_TYPE_OBSERVED) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-1.5 py-0.2 rounded-sm text-[10px] font-mono font-medium tracking-wide border select-none ${className}`}
        style={{
          backgroundColor: 'var(--ff-observed-bg)',
          borderColor: 'rgba(66, 184, 153, 0.35)',
          color: 'var(--ff-observed)',
        }}
        aria-label="Observed frame"
      >
        <span
          className="w-1.5 h-1.5 rounded-full inline-block shrink-0"
          style={{ backgroundColor: 'var(--ff-observed)' }}
        />
        OBSERVED
      </span>
    );
  }

  if (type === FRAME_TYPE_SYNTHETIC) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-1.5 py-0.2 rounded-sm text-[10px] font-mono font-medium tracking-wide border select-none ${className}`}
        style={{
          backgroundColor: 'var(--ff-synthetic-bg)',
          borderColor: 'rgba(221, 163, 56, 0.35)',
          color: 'var(--ff-synthetic)',
        }}
        aria-label="Synthetic frame — model output, not an observation"
      >
        <span
          className="w-1.5 h-1.5 rounded-full inline-block shrink-0"
          style={{ backgroundColor: 'var(--ff-synthetic)' }}
        />
        SYNTHETIC
      </span>
    );
  }

  return null;
};

export default Badge;
