import React, { useState, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Sliders,
  Columns,
  Layers,
} from 'lucide-react';
import FramePanel from '../components/FramePanel';
import SliderCompare from '../components/SliderCompare';
import ColorBar from '../components/ColorBar';
import Badge from '../components/Badge';
import LoadingSpinner from '../components/LoadingSpinner';
import PageShell from '../components/PageShell';
import { useChat } from '../context/ChatContext';
import { fetchDemoPrediction } from '../api';
import { FRAME_TYPE_OBSERVED, FRAME_TYPE_SYNTHETIC } from '../types';
import type { PredictResult } from '../types';

export const ViewerPage: React.FC = () => {
  const { setPageContext } = useChat();
  const [result, setResult] = useState<PredictResult | null>(null);
  const [loadingDemo, setLoadingDemo] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'animation' | 'side-by-side' | 'slider'>('animation');

  const handleLoadDemo = async () => {
    try {
      setLoadingDemo(true);
      const res = await fetchDemoPrediction();
      setResult(res);
      sessionStorage.setItem('last_predict_result', JSON.stringify(res));
    } catch (e) {
      console.error('Failed to load demo:', e);
    } finally {
      setLoadingDemo(false);
    }
  };

  // Animation playback state
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1);
  const [loop, setLoop] = useState<boolean>(true);

  // Load from sessionStorage if available
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('last_predict_result');
      if (stored) {
        setResult(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  const frames = result?.frames
    ? [
        {
          src: result.frames.first,
          title: 'First Frame (t = 0)',
          type: FRAME_TYPE_OBSERVED,
          subtitle: 'Observed GOES-19 IR frame',
        },
        {
          src: result.frames.middle,
          title: 'Predicted Middle (t = +10m)',
          type: FRAME_TYPE_SYNTHETIC,
          subtitle: 'SYNTHETIC model output (50/50 blend)',
        },
        {
          src: result.frames.second,
          title: 'Second Frame (t = +20m)',
          type: FRAME_TYPE_OBSERVED,
          subtitle: 'Observed GOES-19 IR frame',
        },
      ].filter((f) => !!f.src)
    : [];

  useEffect(() => {
    setPageContext({
      page: 'viewer',
      method_used: result?.method_used,
      physical: result?.physical,
      gap_min: result?.gap_min,
      metrics: result?.metrics,
      frame_info: `Viewer in ${viewMode} mode displaying ${frames.length} frames`,
      scene_region: 'GOES-19 ABI Band 13 convective cluster (Equatorial South America / ITCZ)',
      image_description: `Three-frame temporal interpolation view: Frame 0 (t=0 min observed), Middle Frame (t=10 min ${result?.physical ? 'synthetic 50/50 blend prediction' : 'prediction'}), and Frame 1 (t=20 min observed). Brightness temperature scale: bright yellow-green = cold storm tops (~188-235 K), dark purple = warm land/ocean (~300 K).`,
      features_visible: 'Side-by-side / split view showing cloud advection and storm evolution over 20 minutes with synthesized 10-minute midpoint.',
    });
  }, [result, viewMode, frames.length, setPageContext]);

  const stepForward = useCallback(() => {
    if (frames.length === 0) return;
    setCurrentIdx((prev) => {
      if (prev >= frames.length - 1) {
        return loop ? 0 : prev;
      }
      return prev + 1;
    });
  }, [frames.length, loop]);

  const stepBackward = useCallback(() => {
    if (frames.length === 0) return;
    setCurrentIdx((prev) => (prev <= 0 ? (loop ? frames.length - 1 : 0) : prev - 1));
  }, [frames.length, loop]);

  // Animation interval timer
  useEffect(() => {
    if (!isPlaying || frames.length === 0) return;
    const intervalMs = Math.round(600 / speed);
    const timer = setInterval(() => {
      stepForward();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [isPlaying, speed, stepForward, frames.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        stepForward();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        stepBackward();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stepForward, stepBackward]);

  const currentFrame = frames[currentIdx];

  return (
    <PageShell>
      {/* Viewer Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--ff-border)]">
        <div>
          <h1 className="text-base font-semibold text-[var(--ff-text)] tracking-tight">
            Synchronized Frame Viewer
          </h1>
          <p className="text-xs text-[var(--ff-text-secondary)] mt-0.5">
            Synchronized animation, side-by-side inspection, and split-slider comparison of observed and synthetic imagery.
          </p>
        </div>

        {/* View Mode Segmented Controls */}
        <div className="flex items-center gap-0.5 p-0.5 bg-[var(--ff-panel)] border border-[var(--ff-border)] rounded-sm self-start sm:self-auto text-xs">
          <button
            onClick={() => setViewMode('animation')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-medium transition-colors ${
              viewMode === 'animation'
                ? 'bg-[var(--ff-workspace)] text-[var(--ff-text)] font-semibold border border-[var(--ff-border)]'
                : 'text-[var(--ff-text-secondary)] hover:text-[var(--ff-text)]'
            }`}
          >
            <Play size={11} />
            <span>Animation</span>
          </button>
          <button
            onClick={() => setViewMode('side-by-side')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-medium transition-colors ${
              viewMode === 'side-by-side'
                ? 'bg-[var(--ff-workspace)] text-[var(--ff-text)] font-semibold border border-[var(--ff-border)]'
                : 'text-[var(--ff-text-secondary)] hover:text-[var(--ff-text)]'
            }`}
          >
            <Columns size={11} />
            <span>Side by Side</span>
          </button>
          <button
            onClick={() => setViewMode('slider')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-medium transition-colors ${
              viewMode === 'slider'
                ? 'bg-[var(--ff-workspace)] text-[var(--ff-text)] font-semibold border border-[var(--ff-border)]'
                : 'text-[var(--ff-text-secondary)] hover:text-[var(--ff-text)]'
            }`}
          >
            <Sliders size={11} />
            <span>Split Slider</span>
          </button>
        </div>
      </div>

      {loadingDemo ? (
        <LoadingSpinner label="Loading real NOAA GOES-19 validation triplet..." />
      ) : !result || frames.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-sm border border-[var(--ff-border)] bg-[var(--ff-workspace)] space-y-3">
          <Layers size={32} className="text-[var(--ff-text-muted)]" />
          <div>
            <h3 className="text-sm font-semibold text-[var(--ff-text)]">No Satellite Triplet Loaded</h3>
            <p className="text-xs text-[var(--ff-text-secondary)] font-mono max-w-sm mt-1">
              Load the real NOAA GOES-19 sample triplet to test synchronized playback and split comparison.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleLoadDemo}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm font-medium text-xs text-black bg-[var(--ff-accent)] hover:bg-[var(--ff-accent-hover)] transition-colors"
            >
              <Play size={12} fill="currentColor" />
              <span>Load Sample Triplet</span>
            </button>
            <a
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm font-mono text-xs text-[var(--ff-text)] bg-[var(--ff-panel)] hover:bg-[var(--ff-workspace)] border border-[var(--ff-border)] transition-colors"
            >
              Go to Predict Page
            </a>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Metadata & Color Bar Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-3 py-1.5 rounded-sm border border-[var(--ff-border)] bg-[var(--ff-panel)]">
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-[var(--ff-text-secondary)]">Model:</span>
              <span className="font-semibold text-[var(--ff-text)] uppercase">{result.method_used}</span>
              <span className="text-[var(--ff-border)]">·</span>
              <span className="text-[var(--ff-text-secondary)]">Band Range:</span>
              <span className="text-[var(--ff-text)]">180–330 K</span>
            </div>
            <ColorBar type="bt" />
          </div>

          {/* Mode 1: Animation Player */}
          {viewMode === 'animation' && currentFrame && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-start">
              {/* Main Player Display (2 cols) */}
              <div className="lg:col-span-2 space-y-2.5">
                <FramePanel
                  title={currentFrame.title}
                  imageSrc={currentFrame.src}
                  type={currentFrame.type === FRAME_TYPE_SYNTHETIC ? 'synthetic' : 'observed'}
                  subtitle={currentFrame.subtitle}
                  className="w-full"
                />

                {/* Player Controls Bar */}
                <div className="flex flex-col gap-2 p-2.5 rounded-sm border border-[var(--ff-border)] bg-[var(--ff-workspace)]">
                  {/* Timeline Scrubber */}
                  <div className="flex items-center justify-between gap-1">
                    {frames.map((f, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentIdx(i)}
                        className={`flex-1 h-2 rounded-xs transition-all ${
                          i === currentIdx
                            ? f.type === FRAME_TYPE_SYNTHETIC
                              ? 'bg-[var(--ff-synthetic)] ring-2 ring-[var(--ff-synthetic)]/40'
                              : 'bg-[var(--ff-observed)] ring-2 ring-[var(--ff-observed)]/40'
                            : 'bg-[var(--ff-border)] hover:bg-[var(--ff-text-secondary)]'
                        }`}
                        title={`Jump to ${f.title}`}
                        aria-label={`Jump to frame ${i + 1}: ${f.title}`}
                      />
                    ))}
                  </div>

                  {/* Playback Button Controls */}
                  <div className="flex items-center justify-between pt-0.5">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={stepBackward}
                        className="p-1.5 rounded-sm bg-[var(--ff-panel)] hover:bg-[var(--ff-workspace)] text-[var(--ff-text)] border border-[var(--ff-border)] transition-colors"
                        title="Previous Frame (Left Arrow)"
                        aria-label="Previous Frame"
                      >
                        <SkipBack size={13} />
                      </button>
                      <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="flex items-center gap-1 px-3 py-1 rounded-sm font-medium text-xs text-black bg-[var(--ff-accent)] hover:bg-[var(--ff-accent-hover)] transition-colors"
                        title="Play / Pause (Space)"
                        aria-label={isPlaying ? 'Pause animation' : 'Play animation'}
                      >
                        {isPlaying ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
                        <span>{isPlaying ? 'Pause' : 'Play'}</span>
                      </button>
                      <button
                        onClick={stepForward}
                        className="p-1.5 rounded-sm bg-[var(--ff-panel)] hover:bg-[var(--ff-workspace)] text-[var(--ff-text)] border border-[var(--ff-border)] transition-colors"
                        title="Next Frame (Right Arrow)"
                        aria-label="Next Frame"
                      >
                        <SkipForward size={13} />
                      </button>
                    </div>

                    {/* Speed & Loop */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-0.5 bg-[var(--ff-panel)] border border-[var(--ff-border)] rounded-sm p-0.5 text-xs">
                        {[0.5, 1, 2].map((s) => (
                          <button
                            key={s}
                            onClick={() => setSpeed(s)}
                            className={`px-1.5 py-0.2 rounded-xs font-mono text-[10.5px] font-medium transition-colors ${
                              speed === s ? 'bg-[var(--ff-workspace)] text-[var(--ff-accent)] border border-[var(--ff-border)]' : 'text-[var(--ff-text-secondary)]'
                            }`}
                          >
                            {s}x
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={() => setLoop(!loop)}
                        className={`p-1 rounded-sm border transition-colors ${
                          loop
                            ? 'bg-[var(--ff-panel)] text-[var(--ff-accent)] border-[var(--ff-accent)]'
                            : 'bg-[var(--ff-panel)] text-[var(--ff-text-muted)] border-[var(--ff-border)]'
                        }`}
                        title={loop ? 'Looping Enabled' : 'Looping Disabled'}
                        aria-label="Toggle loop"
                      >
                        <RotateCcw size={12} />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-[var(--ff-text-muted)] font-mono border-t border-[var(--ff-border-subtle)] pt-1">
                    <span>Frame {currentIdx + 1} of {frames.length}</span>
                    <span>Keys: Space (Play/Pause), ← / → (Step)</span>
                  </div>
                </div>
              </div>

              {/* Frame Playlist sidebar */}
              <div className="space-y-2 p-2.5 rounded-sm border border-[var(--ff-border)] bg-[var(--ff-workspace)]">
                <h4 className="text-[11px] font-mono font-medium text-[var(--ff-text-secondary)] uppercase tracking-wider">
                  Sequence Components
                </h4>
                <div className="space-y-1.5">
                  {frames.map((f, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setCurrentIdx(i);
                        setIsPlaying(false);
                      }}
                      className={`w-full flex items-center justify-between p-1.5 rounded-sm border text-left transition-colors ${
                        i === currentIdx
                          ? 'border-[var(--ff-accent)] bg-[var(--ff-panel)]'
                          : 'border-[var(--ff-border)] bg-[var(--ff-workspace)] hover:border-[var(--ff-text-secondary)]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <img
                          src={f.src}
                          alt={f.title}
                          className="w-8 h-8 rounded-xs object-cover border border-[var(--ff-border)] bg-black"
                        />
                        <div className="truncate">
                          <div className="text-xs font-medium text-[var(--ff-text)] truncate">{f.title}</div>
                          <div className="text-[10px] font-mono text-[var(--ff-text-secondary)] truncate">{f.subtitle}</div>
                        </div>
                      </div>
                      <Badge type={f.type} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Mode 2: Side-by-side View */}
          {viewMode === 'side-by-side' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <FramePanel
                  title="First Frame (t = 0)"
                  imageSrc={result.frames.first}
                  type="observed"
                  subtitle="Observed GOES-19 IR frame"
                />
                <FramePanel
                  title="Predicted Middle (t = +10m)"
                  imageSrc={result.frames.middle}
                  type="synthetic"
                  subtitle="SYNTHETIC model prediction"
                />
                <FramePanel
                  title="Second Frame (t = +20m)"
                  imageSrc={result.frames.second}
                  type="observed"
                  subtitle="Observed GOES-19 IR frame"
                />
              </div>

              {result.frames.truth && (
                <div className="pt-2.5 border-t border-[var(--ff-border)] space-y-2">
                  <h4 className="text-xs font-semibold text-[var(--ff-text)] uppercase tracking-wide">
                    Ground Truth Comparison
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-4xl">
                    <FramePanel
                      title="Real Middle Frame"
                      imageSrc={result.frames.truth}
                      type="observed"
                      subtitle="Ground truth radiometer observation"
                    />
                    <FramePanel
                      title="Difference Map (Pred - Truth)"
                      imageSrc={result.frames.difference}
                      type="diff"
                      subtitle="Diverging ±10 K (PuOr_r)"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mode 3: Split Slider Comparison */}
          {viewMode === 'slider' && (
            <div className="max-w-3xl mx-auto space-y-2">
              {result.frames.truth ? (
                <SliderCompare
                  leftImage={result.frames.truth}
                  rightImage={result.frames.middle || ''}
                  leftTitle="Real Middle (Ground Truth)"
                  rightTitle="Predicted Middle (Model Output)"
                  leftType="observed"
                  rightType="synthetic"
                />
              ) : (
                <SliderCompare
                  leftImage={result.frames.first || ''}
                  rightImage={result.frames.middle || ''}
                  leftTitle="First Frame (Observed)"
                  rightTitle="Predicted Middle (Synthetic)"
                  leftType="observed"
                  rightType="synthetic"
                />
              )}
              <p className="text-[11px] text-[var(--ff-text-secondary)] text-center font-mono">
                Drag the divider or use keyboard ← / → keys to inspect pixel differences between observed and synthetic frames.
              </p>
            </div>
          )}
        </div>
      )}
    </PageShell>
  );
};

export default ViewerPage;
