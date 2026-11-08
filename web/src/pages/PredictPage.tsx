import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Download,
  AlertCircle,
  FileCheck,
  Layers,
  ArrowRight,
  FolderOpen,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import FramePanel from '../components/FramePanel';
import MetricsTable from '../components/MetricsTable';
import ColorBar from '../components/ColorBar';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorState from '../components/ErrorState';
import PageShell from '../components/PageShell';
import { useChat } from '../context/ChatContext';
import { predict, gifUrl, zipUrl, fetchDemoTripletFiles, fetchDemoPrediction } from '../api';
import type { PredictResult, InterpolationMethod } from '../types';

interface PredictPageProps {
  onPredictionComplete?: (result: PredictResult) => void;
}

export const PredictPage: React.FC<PredictPageProps> = ({ onPredictionComplete }) => {
  const { setPageContext } = useChat();
  const [firstFile, setFirstFile] = useState<File | null>(null);
  const [secondFile, setSecondFile] = useState<File | null>(null);
  const [truthFile, setTruthFile] = useState<File | null>(null);
  const [method, setMethod] = useState<InterpolationMethod>('blend');
  const [gapMin, setGapMin] = useState<number>(20);

  const [loading, setLoading] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PredictResult | null>(null);

  // File format warnings
  const [firstNotice, setFirstNotice] = useState<string | null>(null);
  const [secondNotice, setSecondNotice] = useState<string | null>(null);

  const firstInputRef = useRef<HTMLInputElement>(null);
  const secondInputRef = useRef<HTMLInputElement>(null);
  const truthInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPageContext({
      page: 'predict',
      method_used: result?.method_used || method,
      physical: result?.physical,
      gap_min: gapMin,
      metrics: result?.metrics,
      notice: result?.notice,
      frame_info: result
        ? 'Active prediction result with first, middle, second' + (result.metrics ? ' and truth validation' : '')
        : 'Predict form ready to upload GOES-19 frames',
      scene_region: 'GOES-19 ABI Channel 13 (clean thermal IR band)',
      image_description: result
        ? `Interpolation comparison using ${result.method_used}: t=0 min observed frame, t=10 min synthesized frame, and t=20 min observed frame. Shows cloud motion advection across convective storm cells.`
        : 'GOES-19 ABI Channel 13 input selector for temporal frame interpolation.',
      features_visible: result
        ? 'Input frames (t=0, t=20) and synthesized intermediate frame (t=10) with brightness temperature scale.'
        : 'Upload controls for NetCDF or visual imagery.',
    });
  }, [method, gapMin, result, setPageContext]);

  const checkFile = (file: File, setNotice: (msg: string | null) => void) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'png' || ext === 'jpg' || ext === 'jpeg') {
      setNotice('Visual mode: image RGB channels are normalized, not calibrated Kelvin.');
    } else {
      setNotice(null);
    }
  };

  const handleFirstChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFirstFile(f);
      checkFile(f, setFirstNotice);
    }
  };

  const handleSecondChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setSecondFile(f);
      checkFile(f, setSecondNotice);
    }
  };

  const handleTruthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setTruthFile(f);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstFile || !secondFile) {
      setError('Please provide both the first and second frames.');
      return;
    }

    setError(null);
    setLoading(true);
    setProgressMsg('Uploading radiometer frames and running interpolation engine...');

    try {
      const res = await predict({
        first: firstFile,
        second: secondFile,
        truth: truthFile || undefined,
        gap_min: gapMin,
        method,
      });

      setResult(res);
      if (onPredictionComplete) onPredictionComplete(res);
      try {
        sessionStorage.setItem('last_predict_result', JSON.stringify(res));
      } catch {
        // ignore quota
      }
    } catch (err: any) {
      setError(err.message || 'Prediction failed');
    } finally {
      setLoading(false);
      setProgressMsg('');
    }
  };

  const loadSampleFrames = async () => {
    setError(null);
    setLoading(true);
    setProgressMsg('Loading NOAA GOES-19 ABI L2 CMIPF Ch13 NetCDF triplet...');
    try {
      const files = await fetchDemoTripletFiles();
      setFirstFile(files.first);
      setSecondFile(files.second);
      setTruthFile(files.truth);
      setFirstNotice(null);
      setSecondNotice(null);
    } catch (e: any) {
      setError('Could not load sample NetCDF files: ' + e.message);
    } finally {
      setLoading(false);
      setProgressMsg('');
    }
  };

  const loadInstantDemo = async () => {
    setError(null);
    setLoading(true);
    setProgressMsg('Loading precomputed physical prediction on NOAA GOES-19 triplet...');
    try {
      const res = await fetchDemoPrediction();
      setResult(res);
      if (onPredictionComplete) onPredictionComplete(res);
      try {
        sessionStorage.setItem('last_predict_result', JSON.stringify(res));
      } catch {
        // ignore
      }
    } catch (e: any) {
      setError('Could not load demo prediction: ' + e.message);
    } finally {
      setLoading(false);
      setProgressMsg('');
    }
  };

  return (
    <PageShell>
      {/* Generous Upper Space & Clear Typography */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-[var(--ff-border)]">
        <div>
          <h1 className="text-2xl font-bold text-[var(--ff-text)] tracking-tight">
            Temporal Frame Prediction
          </h1>
          <p className="text-sm text-[var(--ff-text-secondary)] mt-1.5 leading-relaxed">
            Geostationary thermal-IR intermediate frame synthesis via 50/50 OpenCV DIS optical flow &amp; Practical-RIFE v4.22.
          </p>
        </div>

        {/* Friendly Sample Presets */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={loadSampleFrames}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-sm font-medium bg-[var(--ff-panel)] hover:bg-[var(--ff-panel-subtle)] text-[var(--ff-text)] border border-[var(--ff-border)] hover:border-[var(--ff-accent)] transition-all shadow-sm"
            title="Load real NOAA GOES-19 NetCDF files into the form"
          >
            <Layers size={15} className="text-[var(--ff-accent)]" />
            <span>Load Sample NetCDFs</span>
          </button>
          <button
            type="button"
            onClick={loadInstantDemo}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-sm font-semibold bg-[var(--ff-accent)] hover:bg-[var(--ff-accent-hover)] text-black transition-all shadow-sm"
            title="Instant physical prediction on real GOES-19 sample"
          >
            <Play size={14} fill="currentColor" />
            <span>Quick Demo View</span>
          </button>
        </div>
      </div>

      {/* Primary Channel Ingestion & Execution Instrument */}
      <form onSubmit={handleSubmit} className="rounded-lg border border-[var(--ff-border)] bg-[var(--ff-workspace)] shadow-sm divide-y divide-[var(--ff-border)]">
        {/* Input Channels Section */}
        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-[var(--ff-text-secondary)]">
            <span className="font-semibold uppercase tracking-wider text-[var(--ff-text)]">
              Input Radiometer Channels
            </span>
            <span>Max 1024×1024 px · NetCDF (.nc), NPY, PNG</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Channel A (t = 0) */}
            <div className="p-4 rounded-md bg-[var(--ff-panel)] border border-[var(--ff-border)] flex flex-col justify-between min-h-[110px] transition-colors hover:border-[var(--ff-accent)]">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[var(--ff-text)]">
                  First Frame (t = 0)
                </span>
                <span className="text-xs font-mono text-[var(--ff-error)] font-medium">*Required</span>
              </div>

              <div className="my-2.5">
                {firstFile ? (
                  <div className="flex items-center gap-2 text-sm font-mono text-[var(--ff-observed)] font-medium">
                    <FileCheck size={16} className="shrink-0" />
                    <span className="truncate">{firstFile.name}</span>
                  </div>
                ) : (
                  <span className="text-xs text-[var(--ff-text-muted)] font-mono">
                    Select initial satellite scan
                  </span>
                )}
                {firstNotice && (
                  <span className="text-xs font-mono text-[var(--ff-synthetic)] mt-1 block">
                    {firstNotice}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[var(--ff-border-subtle)] text-xs font-mono">
                <input
                  ref={firstInputRef}
                  type="file"
                  accept=".nc,.nc4,.h5,.npy,.png,.jpg,.jpeg"
                  onChange={handleFirstChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => firstInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 text-[var(--ff-accent)] hover:underline font-medium"
                >
                  <FolderOpen size={14} />
                  <span>Browse file...</span>
                </button>
                {firstFile && (
                  <span className="text-[var(--ff-text-muted)]">
                    {(firstFile.size / 1024).toFixed(0)} KB
                  </span>
                )}
              </div>
            </div>

            {/* Channel B (t = +gap) */}
            <div className="p-4 rounded-md bg-[var(--ff-panel)] border border-[var(--ff-border)] flex flex-col justify-between min-h-[110px] transition-colors hover:border-[var(--ff-accent)]">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[var(--ff-text)]">
                  Second Frame (t = +{gapMin}m)
                </span>
                <span className="text-xs font-mono text-[var(--ff-error)] font-medium">*Required</span>
              </div>

              <div className="my-2.5">
                {secondFile ? (
                  <div className="flex items-center gap-2 text-sm font-mono text-[var(--ff-observed)] font-medium">
                    <FileCheck size={16} className="shrink-0" />
                    <span className="truncate">{secondFile.name}</span>
                  </div>
                ) : (
                  <span className="text-xs text-[var(--ff-text-muted)] font-mono">
                    Select subsequent scan
                  </span>
                )}
                {secondNotice && (
                  <span className="text-xs font-mono text-[var(--ff-synthetic)] mt-1 block">
                    {secondNotice}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[var(--ff-border-subtle)] text-xs font-mono">
                <input
                  ref={secondInputRef}
                  type="file"
                  accept=".nc,.nc4,.h5,.npy,.png,.jpg,.jpeg"
                  onChange={handleSecondChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => secondInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 text-[var(--ff-accent)] hover:underline font-medium"
                >
                  <FolderOpen size={14} />
                  <span>Browse file...</span>
                </button>
                {secondFile && (
                  <span className="text-[var(--ff-text-muted)]">
                    {(secondFile.size / 1024).toFixed(0)} KB
                  </span>
                )}
              </div>
            </div>

            {/* Ground Truth Target (optional) */}
            <div className="p-4 rounded-md bg-[var(--ff-panel)] border border-[var(--ff-border)] flex flex-col justify-between min-h-[110px] transition-colors hover:border-[var(--ff-text-secondary)]">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[var(--ff-text)]">
                  Ground Truth Middle Frame
                </span>
                <span className="text-xs font-mono text-[var(--ff-text-muted)]">Optional</span>
              </div>

              <div className="my-2.5">
                {truthFile ? (
                  <div className="flex items-center gap-2 text-sm font-mono text-[var(--ff-observed)] font-medium">
                    <FileCheck size={16} className="shrink-0" />
                    <span className="truncate">{truthFile.name}</span>
                  </div>
                ) : (
                  <span className="text-xs text-[var(--ff-text-muted)] font-mono">
                    Real observed middle for scoring
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[var(--ff-border-subtle)] text-xs font-mono">
                <input
                  ref={truthInputRef}
                  type="file"
                  accept=".nc,.nc4,.h5,.npy,.png,.jpg,.jpeg"
                  onChange={handleTruthChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => truthInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 text-[var(--ff-text-secondary)] hover:text-[var(--ff-text)] hover:underline font-medium"
                >
                  <FolderOpen size={14} />
                  <span>Browse file...</span>
                </button>
                {truthFile && (
                  <span className="text-[var(--ff-text-muted)]">
                    {(truthFile.size / 1024).toFixed(0)} KB
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Execution & Model Parameter Strip */}
        <div className="p-4 bg-[var(--ff-panel-subtle)] flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-5 text-sm font-mono">
            <div className="flex items-center gap-2">
              <label className="text-[var(--ff-text-secondary)] font-sans">Interpolation Engine:</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as InterpolationMethod)}
                className="bg-[var(--ff-panel)] text-[var(--ff-text)] border border-[var(--ff-border)] rounded px-3 py-1.5 text-sm focus:ring-1 focus:ring-[var(--ff-accent)] focus:outline-none"
              >
                <option value="blend">50/50 Blend: DIS + RIFE v4.22 (Ensemble)</option>
                <option value="dis">DIS Optical Flow (OpenCV medium)</option>
                <option value="rife">RIFE v4.22 only (scale 2.0)</option>
                <option value="average">Linear Average (B0 baseline)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-[var(--ff-text-secondary)] font-sans">Time Gap:</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={gapMin}
                  onChange={(e) => setGapMin(Number(e.target.value))}
                  className="w-18 bg-[var(--ff-panel)] text-[var(--ff-text)] border border-[var(--ff-border)] rounded px-2.5 py-1.5 text-sm focus:ring-1 focus:ring-[var(--ff-accent)] focus:outline-none font-mono"
                />
                <span className="text-[var(--ff-text-muted)]">min</span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !firstFile || !secondFile}
            className="h-10 px-6 rounded-md font-semibold text-sm text-black bg-[var(--ff-accent)] hover:bg-[var(--ff-accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md flex items-center gap-2"
          >
            <Play size={14} fill="currentColor" />
            <span>{loading ? 'Synthesizing...' : 'Predict Middle Frame'}</span>
          </button>
        </div>
      </form>

      {/* Loading state */}
      {loading && <LoadingSpinner label={progressMsg || 'Running interpolation engine...'} size={28} />}

      {/* Error state */}
      {error && <ErrorState title="Interpolation Error" message={error} onRetry={() => setError(null)} />}

      {/* Friendly Guide / Empty State when no prediction loaded yet */}
      {!result && !loading && !error && (
        <div className="p-6 rounded-lg border border-[var(--ff-border)] bg-[var(--ff-workspace)] text-center space-y-4 my-2">
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-base font-semibold text-[var(--ff-text)]">
              Ready to Interpolate Geostationary Frames
            </h3>
            <p className="text-sm text-[var(--ff-text-secondary)] leading-relaxed">
              Upload two sequential satellite frames from NOAA GOES ABI Channel 13, or click{' '}
              <button
                type="button"
                onClick={loadSampleFrames}
                className="text-[var(--ff-accent)] hover:underline font-medium"
              >
                use demo dataset
              </button>{' '}
              to run a full demonstration on real hurricane/convective storm data.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto pt-2 text-left text-xs font-mono text-[var(--ff-text-secondary)]">
            <div className="p-3 rounded bg-[var(--ff-panel)] border border-[var(--ff-border)]">
              <span className="text-[var(--ff-observed)] font-bold block mb-1">01. INGEST</span>
              Two observed frames at $t=0$ and $t=20$ min cadence in calibrated Kelvin.
            </div>
            <div className="p-3 rounded bg-[var(--ff-panel)] border border-[var(--ff-border)]">
              <span className="text-[var(--ff-accent)] font-bold block mb-1">02. ENSEMBLE</span>
              OpenCV DIS optical flow warp blended 50/50 with RIFE v4.22 neural model.
            </div>
            <div className="p-3 rounded bg-[var(--ff-panel)] border border-[var(--ff-border)]">
              <span className="text-[var(--ff-synthetic)] font-bold block mb-1">03. SYNTHESIZE</span>
              $t=10$ min intermediate state + spatial error map &amp; dynamic RMSE metrics.
            </div>
          </div>
        </div>
      )}

      {/* Output Section */}
      {result && (
        <div className="space-y-6 pt-2">
          {result.notice && (
            <div className="p-3 rounded border border-[var(--ff-synthetic)] bg-[var(--ff-synthetic-bg)] text-[var(--ff-synthetic)] text-sm flex items-center gap-2 font-mono">
              <AlertCircle size={16} className="shrink-0" />
              <span>{result.notice}</span>
            </div>
          )}

          {/* Result Metadata & File Export Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-lg border border-[var(--ff-border)] bg-[var(--ff-panel)] text-sm font-mono">
            <div className="flex items-center gap-3">
              <span className="text-[var(--ff-text-secondary)]">Engine:</span>
              <span className="font-semibold text-[var(--ff-text)] uppercase">{result.method_used}</span>
              <span className="text-[var(--ff-border)]">·</span>
              <span className="text-[var(--ff-text-secondary)]">Mode:</span>
              <span style={{ color: result.physical ? 'var(--ff-observed)' : 'var(--ff-synthetic)' }}>
                {result.physical ? 'Physical (Kelvin calibrated)' : 'Visual Mode'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {result.download && (
                <a
                  href={result.download}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[var(--ff-workspace)] hover:bg-[var(--ff-panel-subtle)] text-[var(--ff-text)] border border-[var(--ff-border)] text-xs font-medium transition-colors"
                >
                  <Download size={13} />
                  <span>Download .nc</span>
                </a>
              )}
              {result.download && (
                <a
                  href={gifUrl(result.download.split('/').pop() || '')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[var(--ff-workspace)] hover:bg-[var(--ff-panel-subtle)] text-[var(--ff-text)] border border-[var(--ff-border)] text-xs font-medium transition-colors"
                >
                  <Download size={13} />
                  <span>Animated GIF</span>
                </a>
              )}
              {result.download && (
                <a
                  href={zipUrl(result.download.split('/').pop() || '')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[var(--ff-workspace)] hover:bg-[var(--ff-panel-subtle)] text-[var(--ff-text)] border border-[var(--ff-border)] text-xs font-medium transition-colors"
                >
                  <Download size={13} />
                  <span>PNG ZIP</span>
                </a>
              )}
              <Link
                to="/viewer"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-[var(--ff-accent)] hover:bg-[var(--ff-accent-hover)] text-black font-semibold text-xs transition-colors"
              >
                <span>Open in Viewer</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>

          {/* Triplet Visualization (t=0, t=mid, t=gap) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-semibold text-[var(--ff-text)] uppercase tracking-wider">
                Interpolation Sequence (512×512 Calibrated Grid)
              </span>
              <ColorBar type="bt" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FramePanel
                title="First Frame"
                timeLabel="t = 0"
                imageSrc={result.frames.first}
                type="observed"
                subtitle="Observed GOES-19 IR frame"
                downloadFilename="frame_0_observed.png"
              />
              <FramePanel
                title="Synthesized Middle Frame"
                timeLabel={`t = +${(gapMin / 2).toFixed(0)} min`}
                imageSrc={result.frames.middle}
                type="synthetic"
                subtitle="SYNTHETIC model prediction (50/50 blend)"
                downloadFilename="frame_mid_synthetic.png"
              />
              <FramePanel
                title="Second Frame"
                timeLabel={`t = +${gapMin} min`}
                imageSrc={result.frames.second}
                type="observed"
                subtitle="Observed GOES-19 IR frame"
                downloadFilename="frame_1_observed.png"
              />
            </div>
          </div>

          {/* Ground Truth Validation & Difference Map */}
          {result.frames.truth && (
            <div className="pt-4 border-t border-[var(--ff-border)] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-mono font-semibold text-[var(--ff-text)] uppercase tracking-wider">
                    Ground Truth Validation &amp; Difference Map
                  </h3>
                  <p className="text-xs font-mono text-[var(--ff-text-secondary)] mt-0.5">
                    Spatial residual error evaluated against observed middle frame in Kelvin.
                  </p>
                </div>
                <ColorBar type="diff" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <FramePanel
                    title="Real Middle Frame"
                    timeLabel={`Ground Truth (t = +${(gapMin / 2).toFixed(0)} min)`}
                    imageSrc={result.frames.truth}
                    type="observed"
                    subtitle="Observed satellite radiometer"
                    downloadFilename="truth_observed.png"
                  />
                  <FramePanel
                    title="Difference Map"
                    timeLabel="Pred minus Truth (±10 K)"
                    imageSrc={result.frames.difference}
                    type="diff"
                    subtitle="Blue: Colder | Orange: Warmer"
                    downloadFilename="diff_map.png"
                  />
                </div>

                <div>
                  <MetricsTable metrics={result.metrics} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </PageShell>
  );
};

export default PredictPage;
