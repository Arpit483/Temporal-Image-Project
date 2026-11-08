import React, { useState } from 'react';
import { Download, ZoomIn } from 'lucide-react';
import Badge from './Badge';
import { FRAME_TYPE_OBSERVED, FRAME_TYPE_SYNTHETIC } from '../types';

interface FramePanelProps {
  title: string;
  imageSrc?: string;
  type?: 'observed' | 'synthetic' | 'diff';
  timeLabel?: string;
  subtitle?: string;
  downloadFilename?: string;
  className?: string;
}

export const FramePanel: React.FC<FramePanelProps> = ({
  title,
  imageSrc,
  type = 'observed',
  timeLabel,
  subtitle,
  downloadFilename,
  className = '',
}) => {
  const [isZoomed, setIsZoomed] = useState(false);

  const isSynthetic = type === 'synthetic';
  const isObserved = type === 'observed';

  return (
    <div
      className={`relative flex flex-col rounded-sm border border-[var(--ff-border)] bg-[var(--ff-workspace)] overflow-hidden transition-colors ${className}`}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-[var(--ff-border)] bg-[var(--ff-panel)] text-xs">
        <div className="flex items-center gap-1.5 truncate">
          <span className="font-medium text-[var(--ff-text)] truncate text-[12px]">{title}</span>
          {timeLabel && (
            <span className="text-[var(--ff-text-secondary)] font-mono text-[10.5px]">
              ({timeLabel})
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isObserved && <Badge type={FRAME_TYPE_OBSERVED} />}
          {isSynthetic && <Badge type={FRAME_TYPE_SYNTHETIC} />}
          {type === 'diff' && (
            <span
              className="px-1.5 py-0.2 rounded-sm text-[10px] font-mono font-medium border"
              style={{
                backgroundColor: 'rgba(75, 156, 211, 0.12)',
                borderColor: 'rgba(75, 156, 211, 0.3)',
                color: 'var(--ff-accent)',
              }}
            >
              DIFF MAP
            </span>
          )}
        </div>
      </div>

      {/* Image canvas */}
      <div className="relative aspect-square w-full bg-black flex items-center justify-center overflow-hidden group">
        {imageSrc ? (
          <>
            <img
              src={imageSrc}
              alt={`${title} - ${isSynthetic ? 'Synthetic model output' : 'Observed satellite frame'}`}
              className={`w-full h-full object-contain select-none transition-transform duration-150 ${
                isZoomed ? 'scale-150 cursor-zoom-out' : 'cursor-zoom-in'
              }`}
              onClick={() => setIsZoomed(!isZoomed)}
            />

            {/* Corner watermark ribbon for SYNTHETIC frames */}
            {isSynthetic && (
              <div
                className="absolute top-0 right-0 w-11 h-11 pointer-events-none overflow-hidden"
                title="Synthetic frame indicator"
              >
                <div
                  className="absolute transform rotate-45 text-black font-mono font-bold text-[8px] py-0.5 w-16 text-center -top-1 -right-5 shadow-sm"
                  style={{
                    backgroundColor: 'var(--ff-synthetic)',
                    letterSpacing: '0.04em',
                  }}
                >
                  SYN
                </div>
              </div>
            )}

            {/* Subtle hover controls */}
            <div className="absolute bottom-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--ff-workspace)]/90 backdrop-blur-sm border border-[var(--ff-border)] px-1.5 py-0.5 rounded-sm text-xs text-[var(--ff-text)]">
              <button
                onClick={() => setIsZoomed(!isZoomed)}
                className="hover:text-[var(--ff-accent)] p-0.5 transition-colors"
                title={isZoomed ? 'Reset Zoom' : 'Zoom 1.5x'}
                aria-label="Toggle Zoom"
              >
                <ZoomIn size={12} />
              </button>
              {downloadFilename && (
                <a
                  href={imageSrc}
                  download={downloadFilename}
                  className="hover:text-[var(--ff-accent)] p-0.5 transition-colors"
                  title="Download frame PNG"
                  aria-label="Download frame PNG"
                >
                  <Download size={12} />
                </a>
              )}
            </div>
          </>
        ) : (
          <div className="text-[var(--ff-text-muted)] font-mono text-xs italic">No frame loaded</div>
        )}
      </div>

      {/* Subtitle / Metadata strip */}
      {subtitle && (
        <div className="px-2.5 py-1 bg-[var(--ff-panel-subtle)] text-[10.5px] text-[var(--ff-text-secondary)] font-mono border-t border-[var(--ff-border-subtle)] truncate">
          {subtitle}
        </div>
      )}
    </div>
  );
};

export default FramePanel;
