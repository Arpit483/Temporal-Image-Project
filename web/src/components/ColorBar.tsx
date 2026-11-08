import React from 'react';

interface ColorBarProps {
  type?: 'bt' | 'diff';
  className?: string;
}

export const ColorBar: React.FC<ColorBarProps> = ({ type = 'bt', className = '' }) => {
  if (type === 'diff') {
    return (
      <div className={`flex flex-col gap-1 w-full max-w-xs ${className}`}>
        <div className="flex justify-between items-center text-[10px] font-mono text-[var(--ff-text-secondary)]">
          <span className="font-semibold text-[#3B82C4]">-10 K (colder)</span>
          <span className="text-[var(--ff-text-muted)]">0 K</span>
          <span className="font-semibold text-[#E8833A]">+10 K (warmer)</span>
        </div>
        <div
          className="h-2 w-full rounded-sm border border-[var(--ff-border)]"
          style={{
            background: 'linear-gradient(to right, #3B82C4, #8BBBEB, #E8EBF0, #F5B887, #E8833A)',
          }}
          aria-label="Difference color scale: -10K blue to +10K orange"
        />
        <div className="text-[9px] font-mono text-[var(--ff-text-muted)] text-right">
          Symmetric ±10 K (PuOr_r)
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-1 w-full max-w-xs ${className}`}>
      <div className="flex justify-between items-center text-[10px] font-mono text-[var(--ff-text-secondary)]">
        <span className="font-semibold text-[#5DC863]">180 K (cold cloud top)</span>
        <span className="font-semibold text-[#3B528B]">330 K (warm surface)</span>
      </div>
      <div
        className="h-2 w-full rounded-sm border border-[var(--ff-border)]"
        style={{
          background: 'linear-gradient(to right, #FDE725, #5DC863, #21908D, #3B528B, #440154)',
        }}
        aria-label="Brightness temperature scale: 180K bright yellow to 330K dark purple"
      />
      <div className="text-[9px] font-mono text-[var(--ff-text-muted)] text-right">
        Band 13 IR BT: 180–330 K (Viridis inv.)
      </div>
    </div>
  );
};

export default ColorBar;
