import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
} from 'lucide-react';
import Badge from '../components/Badge';
import ColorBar from '../components/ColorBar';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorState from '../components/ErrorState';
import PageShell from '../components/PageShell';
import { useChat } from '../context/ChatContext';
import { fetchSequences, fetchSequence, fetchSequenceFrame } from '../api';
import { FRAME_TYPE_OBSERVED, FRAME_TYPE_SYNTHETIC } from '../types';
import type { SequenceSummary, SequenceDetail, SequenceFrame } from '../types';

export const SequencePage: React.FC = () => {
  const { setPageContext } = useChat();
  const [sequences, setSequences] = useState<SequenceSummary[]>([]);
  const [selectedSeqName, setSelectedSeqName] = useState<string>('');
  const [seqDetail, setSeqDetail] = useState<SequenceDetail | null>(null);

  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [frameCache, setFrameCache] = useState<Record<number, SequenceFrame>>({});
  const inFlightRef = useRef<Set<number>>(new Set());
  const [frameError, setFrameError] = useState<string | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1);
  const [loop, setLoop] = useState<boolean>(true);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch sequence list on mount
  useEffect(() => {
    let mounted = true;
    const loadList = async () => {
      try {
        setLoading(true);
        const list = await fetchSequences();
        if (mounted) {
          setSequences(list);
          if (list.length > 0) {
            setSelectedSeqName(list[0].name);
          }
        }
      } catch (err: any) {
        if (mounted) setError(err.message || 'Failed to list sequences');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadList();
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch sequence detail when sequence selection changes
  useEffect(() => {
    if (!selectedSeqName) return;
    let mounted = true;
    const loadDetail = async () => {
      try {
        setLoading(true);
        const detail = await fetchSequence(selectedSeqName);
        if (mounted) {
          setSeqDetail(detail);
          setCurrentIdx(0);
          setFrameCache({});
        }
      } catch (err: any) {
        if (mounted) setError(err.message || 'Failed to load sequence details');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadDetail();
    return () => {
      mounted = false;
    };
  }, [selectedSeqName]);

  // Fetch single frame by index, permanently cached
  const fetchSingleFrame = useCallback(
    async (seq: string, idx: number) => {
      if (inFlightRef.current.has(idx)) return;
      inFlightRef.current.add(idx);
      try {
        const frame = await fetchSequenceFrame(seq, idx);
        setFrameCache((prev) => {
          if (prev[idx]) return prev;
          return { ...prev, [idx]: frame };
        });
        setFrameError(null);
      } catch (err: any) {
        console.error(`Failed to load sequence frame ${idx + 1}:`, err);
        setFrameError((prev) => prev || `Failed to load frame ${idx + 1}`);
      } finally {
        inFlightRef.current.delete(idx);
      }
    },
    []
  );

  // Load current frame immediately and prefetch window around it
  useEffect(() => {
    if (!selectedSeqName || !seqDetail) return;

    if (!frameCache[currentIdx]) {
      fetchSingleFrame(selectedSeqName, currentIdx);
    }

    const n = seqDetail.n_frames;
    const windowIndices = [
      (currentIdx + 1) % n,
      (currentIdx + 2) % n,
      (currentIdx + 3) % n,
      (currentIdx + 4) % n,
      (currentIdx + 5) % n,
      (currentIdx + 6) % n,
      (currentIdx - 1 + n) % n,
      (currentIdx - 2 + n) % n,
    ];

    windowIndices.forEach((targetIdx) => {
      if (!frameCache[targetIdx]) {
        fetchSingleFrame(selectedSeqName, targetIdx);
      }
    });
  }, [selectedSeqName, seqDetail, currentIdx, frameCache, fetchSingleFrame]);

  const stepForward = useCallback(() => {
    if (!seqDetail) return;
    setCurrentIdx((prev) => {
      if (prev >= seqDetail.n_frames - 1) {
        return loop ? 0 : prev;
      }
      return prev + 1;
    });
  }, [seqDetail, loop]);

  const stepBackward = useCallback(() => {
    if (!seqDetail) return;
    setCurrentIdx((prev) => (prev <= 0 ? (loop ? seqDetail.n_frames - 1 : 0) : prev - 1));
  }, [seqDetail, loop]);

  // Animation interval timer
  useEffect(() => {
    if (!isPlaying || !seqDetail) return;
    const intervalMs = Math.round(500 / speed);
    const timer = setInterval(() => {
      stepForward();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [isPlaying, speed, stepForward, seqDetail]);

  const currentFrame = frameCache[currentIdx];
  const currentFrameType = seqDetail?.frame_types[currentIdx] ?? FRAME_TYPE_OBSERVED;
  const currentTime = seqDetail?.times[currentIdx] || '';

  useEffect(() => {
    setPageContext({
      page: 'sequence',
      sequence_name: selectedSeqName,
      n_observed: seqDetail?.n_observed,
      n_synthetic: seqDetail?.n_synthetic,
      current_frame_idx: currentIdx + 1,
      current_frame_type: currentFrameType,
      frame_info: `Frame ${currentIdx + 1} of ${seqDetail?.n_frames || 0} (${currentFrameType === 1 ? 'SYNTHETIC' : 'OBSERVED'}) at ${currentTime || 'time t'}`,
      scene_region: 'Equatorial South America / Tropical Pacific (ITCZ, Lat -3.6° to +5.7°, Lon -80.7° to -71.4°)',
      image_description: `GOES ABI Band 13 (10.3 µm) brightness temperature sequence. Frame ${currentIdx + 1} is ${currentFrameType === 1 ? 'a SYNTHETIC interpolation (50/50 blend)' : 'an OBSERVED real satellite radiometer acquisition'}. Depicts tropical convective storms with cloud tops down to ~188 K (bright yellow/green) and warm rainforest/ocean background at ~295 K (dark purple).`,
      features_visible: 'Deep convective storm cluster, overshooting tops (<195 K), anvil cirrus cloud shield, warm rainforest terrain and ocean surface (~295 K).',
    });
  }, [selectedSeqName, seqDetail, currentIdx, currentFrameType, currentTime, setPageContext]);

  return (
    <PageShell>
      {/* Header with Dataset Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--ff-border)]">
        <div>
          <h1 className="text-base font-semibold text-[var(--ff-text)] tracking-tight">
            Precomputed Sequence Playback
          </h1>
          <p className="text-xs text-[var(--ff-text-secondary)] mt-0.5">
            Temporal interpolation of 10-minute satellite cadences alongside 20-minute observed intervals.
          </p>
        </div>

        {sequences.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[var(--ff-text-secondary)]">Sequence:</span>
            <select
              value={selectedSeqName}
              onChange={(e) => setSelectedSeqName(e.target.value)}
              className="bg-[var(--ff-panel)] text-[var(--ff-text)] border border-[var(--ff-border)] rounded-sm px-2.5 py-1 text-xs font-mono focus:ring-1 focus:ring-[var(--ff-accent)] focus:outline-none"
            >
              {sequences.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name} ({(s.size / (1024 * 1024)).toFixed(1)} MB)
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading && !seqDetail && <LoadingSpinner label="Loading sequence metadata..." />}
      {error && <ErrorState title="Sequence Error" message={error} onRetry={() => window.location.reload()} />}

      {seqDetail && (
        <div className="space-y-3">
          {/* Metadata & Color Scale Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-1.5 rounded-sm border border-[var(--ff-border)] bg-[var(--ff-panel)] text-xs font-mono">
            <div className="flex items-center gap-4 text-[11px]">
              <div>
                <span className="text-[var(--ff-text-secondary)]">Total: </span>
                <span className="font-semibold text-[var(--ff-text)]">{seqDetail.n_frames} frames</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--ff-observed)]" />
                <span className="text-[var(--ff-text-secondary)]">Observed: </span>
                <span className="font-medium text-[var(--ff-observed)]">{seqDetail.n_observed}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--ff-synthetic)]" />
                <span className="text-[var(--ff-text-secondary)]">Synthetic: </span>
                <span className="font-medium text-[var(--ff-synthetic)]">{seqDetail.n_synthetic}</span>
              </div>
              <div>
                <span className="text-[var(--ff-text-secondary)]">Cadence: </span>
                <span className="text-[var(--ff-text)]">10 min</span>
              </div>
            </div>

            <ColorBar type="bt" />
          </div>

          {/* Player Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-start">
            {/* Main Video/Frame Canvas (2 cols) */}
            <div className="lg:col-span-2 space-y-2.5">
              <div className="relative rounded-sm border border-[var(--ff-border)] bg-[var(--ff-workspace)] overflow-hidden">
                {/* Frame Header */}
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--ff-border)] bg-[var(--ff-panel)] text-xs">
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="text-[var(--ff-text)] font-semibold">
                      Frame {currentIdx + 1} of {seqDetail.n_frames}
                    </span>
                    {currentTime && (
                      <span className="text-[var(--ff-text-secondary)]">
                        · {currentTime}
                      </span>
                    )}
                  </div>
                  <Badge type={currentFrameType} />
                </div>

                {/* Satellite Image Display */}
                <div className="relative aspect-square w-full bg-black flex items-center justify-center">
                  {currentFrame ? (
                    <img
                      src={currentFrame.image}
                      alt={`Sequence frame ${currentIdx + 1}`}
                      className="w-full h-full object-contain select-none"
                    />
                  ) : frameError ? (
                    <div className="flex flex-col items-center justify-center gap-2 p-6 text-center">
                      <span className="text-[var(--ff-error)] text-xs font-mono">{frameError}</span>
                      <button
                        onClick={() => fetchSingleFrame(selectedSeqName, currentIdx)}
                        className="px-2.5 py-1 text-xs font-mono rounded-sm bg-[var(--ff-panel)] text-[var(--ff-text)] border border-[var(--ff-border)]"
                      >
                        Retry Loading Frame {currentIdx + 1}
                      </button>
                    </div>
                  ) : (
                    <LoadingSpinner label="Retrieving calibrated radiometer frame..." />
                  )}

                  {/* Corner ribbon for synthetic frame */}
                  {currentFrameType === FRAME_TYPE_SYNTHETIC && (
                    <div className="absolute top-0 right-0 w-11 h-11 pointer-events-none overflow-hidden">
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
                </div>
              </div>

              {/* Playback Controls Toolbar */}
              <div className="flex flex-col gap-2 p-2.5 rounded-sm border border-[var(--ff-border)] bg-[var(--ff-workspace)]">
                {/* Timeline Scrubber */}
                <div className="flex items-center gap-1 overflow-x-auto py-0.5">
                  {seqDetail.frame_types.map((ft, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentIdx(i)}
                      className={`h-2.5 min-w-[8px] flex-1 rounded-xs transition-all ${
                        i === currentIdx
                          ? ft === FRAME_TYPE_SYNTHETIC
                            ? 'bg-[var(--ff-synthetic)] ring-2 ring-[var(--ff-synthetic)]/50 scale-105 z-10'
                            : 'bg-[var(--ff-observed)] ring-2 ring-[var(--ff-observed)]/50 scale-105 z-10'
                          : ft === FRAME_TYPE_SYNTHETIC
                          ? 'bg-[var(--ff-synthetic)]/30 hover:bg-[var(--ff-synthetic)]'
                          : 'bg-[var(--ff-observed)]/30 hover:bg-[var(--ff-observed)]'
                      }`}
                      title={`Frame ${i + 1}: ${ft === FRAME_TYPE_SYNTHETIC ? 'SYNTHETIC' : 'OBSERVED'}`}
                      aria-label={`Frame ${i + 1} of ${seqDetail.n_frames}`}
                    />
                  ))}
                </div>

                {/* Playback Control Buttons */}
                <div className="flex items-center justify-between pt-0.5">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={stepBackward}
                      className="p-1 rounded-sm bg-[var(--ff-panel)] hover:bg-[var(--ff-workspace)] text-[var(--ff-text)] border border-[var(--ff-border)] transition-colors"
                      title="Previous Frame"
                      aria-label="Previous Frame"
                    >
                      <SkipBack size={13} />
                    </button>
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="flex items-center gap-1 px-3 py-1 rounded-sm font-medium text-xs text-black bg-[var(--ff-accent)] hover:bg-[var(--ff-accent-hover)] transition-colors"
                      aria-label={isPlaying ? 'Pause' : 'Play'}
                    >
                      {isPlaying ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
                      <span>{isPlaying ? 'Pause' : 'Play'}</span>
                    </button>
                    <button
                      onClick={stepForward}
                      className="p-1 rounded-sm bg-[var(--ff-panel)] hover:bg-[var(--ff-workspace)] text-[var(--ff-text)] border border-[var(--ff-border)] transition-colors"
                      title="Next Frame"
                      aria-label="Next Frame"
                    >
                      <SkipForward size={13} />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5 bg-[var(--ff-panel)] border border-[var(--ff-border)] rounded-sm p-0.5 text-xs">
                      {[0.5, 1, 2, 4].map((s) => (
                        <button
                          key={s}
                          onClick={() => setSpeed(s)}
                          className={`px-1.5 py-0.2 rounded-xs font-mono text-[10.5px] font-medium transition-colors ${
                            speed === s
                              ? 'bg-[var(--ff-workspace)] text-[var(--ff-accent)] border border-[var(--ff-border)]'
                              : 'text-[var(--ff-text-secondary)]'
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
                      title={loop ? 'Looping Enabled' : 'No Loop'}
                      aria-label="Toggle loop"
                    >
                      <RotateCcw size={12} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Sequence Legend & Provenance Sidebar */}
            <div className="space-y-2.5 p-3 rounded-sm border border-[var(--ff-border)] bg-[var(--ff-workspace)]">
              <h4 className="text-[11px] font-mono font-medium text-[var(--ff-text-secondary)] uppercase tracking-wider">
                Cadence Interpolation Info
              </h4>

              <div className="space-y-2 text-xs">
                <div className="p-2 rounded-sm bg-[var(--ff-panel)] border border-[var(--ff-border)] space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[var(--ff-observed)]" />
                    <span className="font-medium text-[var(--ff-text)] text-[11px]">Observed Frames (t, t+20m)</span>
                  </div>
                  <p className="text-[10.5px] font-mono text-[var(--ff-text-secondary)]">
                    Direct radiometer scans from NOAA GOES ABI Channel 13.
                  </p>
                </div>

                <div className="p-2 rounded-sm bg-[var(--ff-panel)] border border-[var(--ff-border)] space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[var(--ff-synthetic)]" />
                    <span className="font-medium text-[var(--ff-synthetic)] text-[11px]">Synthetic Frames (t+10m)</span>
                  </div>
                  <p className="text-[10.5px] font-mono text-[var(--ff-text-secondary)]">
                    Model prediction via 50/50 blend of DIS flow-warp and Practical-RIFE v4.22.
                  </p>
                </div>

                <div className="pt-2 border-t border-[var(--ff-border-subtle)] text-[10px] font-mono text-[var(--ff-text-muted)] leading-relaxed">
                  Exported NetCDF files include variable <code>frame_type</code> (0 = observed, 1 = synthetic).
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
};

export default SequencePage;
