import React, { useState, useRef, useCallback, useEffect } from 'react';
import Badge from './Badge';
import { FRAME_TYPE_OBSERVED, FRAME_TYPE_SYNTHETIC } from '../types';

interface SliderCompareProps {
  leftImage: string;
  rightImage: string;
  leftTitle?: string;
  rightTitle?: string;
  leftType?: 'observed' | 'synthetic';
  rightType?: 'observed' | 'synthetic';
  className?: string;
}

export const SliderCompare: React.FC<SliderCompareProps> = ({
  leftImage,
  rightImage,
  leftTitle = 'Real Middle (Ground Truth)',
  rightTitle = 'Predicted Middle (Model)',
  leftType = 'observed',
  rightType = 'synthetic',
  className = '',
}) => {
  const [sliderPos, setSliderPos] = useState(50); // percentage 0 - 100
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const clamped = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(clamped);
  }, []);

  const handleMouseDown = () => setIsDragging(true);

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) handleMove(e.clientX);
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging && e.touches[0]) handleMove(e.touches[0].clientX);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, handleMove]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      setSliderPos((p) => Math.max(0, p - 5));
    } else if (e.key === 'ArrowRight') {
      setSliderPos((p) => Math.min(100, p + 5));
    }
  };

  return (
    <div className={`flex flex-col rounded border border-[var(--ff-border)] bg-[var(--ff-workspace)] overflow-hidden ${className}`}>
      {/* Title bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--ff-border)] bg-[var(--ff-panel)] text-xs">
        <div className="flex items-center gap-2">
          <Badge type={leftType === 'synthetic' ? FRAME_TYPE_SYNTHETIC : FRAME_TYPE_OBSERVED} />
          <span className="font-semibold text-[var(--ff-text)]">{leftTitle}</span>
        </div>
        <div className="text-[var(--ff-text-secondary)] font-mono text-[11px] select-none hidden sm:block">
          Drag divider or use ← / → keys
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[var(--ff-text)]">{rightTitle}</span>
          <Badge type={rightType === 'synthetic' ? FRAME_TYPE_SYNTHETIC : FRAME_TYPE_OBSERVED} />
        </div>
      </div>

      {/* Comparison Area */}
      <div
        ref={containerRef}
        tabIndex={0}
        role="slider"
        aria-label="Split image comparison slider"
        aria-valuenow={Math.round(sliderPos)}
        aria-valuemin={0}
        aria-valuemax={100}
        onKeyDown={handleKeyDown}
        className="relative aspect-square w-full select-none overflow-hidden bg-black focus:outline-none focus:ring-1 focus:ring-[var(--ff-accent)] cursor-ew-resize"
        onMouseDown={(e) => {
          handleMouseDown();
          handleMove(e.clientX);
        }}
        onTouchStart={(e) => {
          if (e.touches[0]) {
            handleMouseDown();
            handleMove(e.touches[0].clientX);
          }
        }}
      >
        {/* Right image (base layer) */}
        <img
          src={rightImage}
          alt={rightTitle}
          className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
        />

        {/* Left image (clipped overlay via clip-path) */}
        <img
          src={leftImage}
          alt={leftTitle}
          className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
          style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
        />

        {/* Draggable vertical divider */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-md pointer-events-none"
          style={{ left: `${sliderPos}%` }}
        >
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-white border border-black shadow flex items-center justify-center text-[10px] text-black font-bold">
            ↔
          </div>
        </div>

        {/* Labels overlay */}
        <div className="absolute bottom-2 left-2 pointer-events-none bg-[var(--ff-panel)]/80 backdrop-blur-sm border border-[var(--ff-border)] px-2 py-0.5 rounded text-[10px] font-mono text-[var(--ff-text)]">
          {leftTitle}
        </div>
        <div className="absolute bottom-2 right-2 pointer-events-none bg-[var(--ff-panel)]/80 backdrop-blur-sm border border-[var(--ff-border)] px-2 py-0.5 rounded text-[10px] font-mono text-[var(--ff-text)]">
          {rightTitle}
        </div>
      </div>
    </div>
  );
};

export default SliderCompare;
