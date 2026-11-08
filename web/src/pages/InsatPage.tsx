import React, { useState, useRef } from 'react';
import {
  FileQuestion,
  Upload,
  CheckCircle2,
  ShieldAlert,
  Info,
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorState from '../components/ErrorState';
import PageShell from '../components/PageShell';
import { useChat } from '../context/ChatContext';
import { inspectInsat } from '../api';
import type { InsatInspectResult } from '../types';

export const InsatPage: React.FC = () => {
  const { setPageContext } = useChat();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<InsatInspectResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setPageContext({
      page: 'insat',
      frame_info: result
        ? `Uploaded file ${result.filename} with ${result.variable_count} variables. INSAT-3DS not demonstrated.`
        : 'INSAT-3DS disclosure page: unvalidated and not demonstrated per scientific integrity rule.',
    });
  }, [result, setPageContext]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setError(null);
      setResult(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select an HDF5 (.h5) or NetCDF (.nc) file to inspect.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await inspectInsat(file);
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'File inspection failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="pb-3 border-b border-[var(--ff-border)]">
        <h1 className="text-lg font-semibold text-[var(--ff-text)] tracking-tight">
          INSAT-3DS Status: Not Demonstrated
        </h1>
        <p className="text-xs text-[var(--ff-text-secondary)] mt-0.5">
          Scientific disclosure: No INSAT-3DS interpolation results are claimed, demonstrated, or fabricated in FrameFill.
        </p>
      </div>

      {/* Mandatory Scientific Integrity Statement */}
      <div className="p-3.5 rounded border border-[var(--ff-synthetic)] bg-[var(--ff-synthetic-bg)] text-xs space-y-2">
        <div className="flex items-center gap-2 font-semibold text-[var(--ff-synthetic)]">
          <ShieldAlert size={16} className="shrink-0" />
          <span>Scientific Integrity Statement: INSAT-3DS Data Unavailable</span>
        </div>
        <p className="text-[var(--ff-text)] font-mono text-[11px] leading-relaxed">
          While the hackathon Problem Statement targets 15-minute intermediate frames for INSAT-3DS,
          <strong> no INSAT-3DS/3DR data was obtainable</strong> for this research prototype.
          Approved MOSDAC credentials and download orders could not be completed during the evaluation window.
          <strong> We do not fake, simulate, or invent INSAT results.</strong>
        </p>
      </div>

      {/* Scientific Domain Shift Rationale */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-3 rounded border border-[var(--ff-border)] bg-[var(--ff-workspace)] space-y-1.5">
          <h4 className="text-xs font-semibold text-[var(--ff-text)] flex items-center gap-1.5">
            <Info size={13} className="text-[var(--ff-accent)] shrink-0" />
            <span>1. Cadence &amp; Ground Truth</span>
          </h4>
          <p className="text-[11px] font-mono text-[var(--ff-text-secondary)] leading-relaxed">
            INSAT-3DS delivers images at ~30 min cadence. Unlike GOES-19 (10-min cadence with observed frame at +10 min),
            there is no real observed frame at 15 minutes to evaluate quantitative accuracy.
          </p>
        </div>

        <div className="p-3 rounded border border-[var(--ff-border)] bg-[var(--ff-workspace)] space-y-1.5">
          <h4 className="text-xs font-semibold text-[var(--ff-text)] flex items-center gap-1.5">
            <Info size={13} className="text-[var(--ff-accent)] shrink-0" />
            <span>2. Sensor Domain Shift</span>
          </h4>
          <p className="text-[11px] font-mono text-[var(--ff-text-secondary)] leading-relaxed">
            INSAT-3DS Imager TIR1 band features different spatial resolution (4 km vs GOES 2 km),
            different sensor MTF, calibration lookup curves (count-to-Kelvin), and an Indian Ocean viewing geometry.
          </p>
        </div>

        <div className="p-3 rounded border border-[var(--ff-border)] bg-[var(--ff-workspace)] space-y-1.5">
          <h4 className="text-xs font-semibold text-[var(--ff-text)] flex items-center gap-1.5">
            <Info size={13} className="text-[var(--ff-accent)] shrink-0" />
            <span>3. Model Retraining Needed</span>
          </h4>
          <p className="text-[11px] font-mono text-[var(--ff-text-secondary)] leading-relaxed">
            RIFE v4.22 was pretrained on standard RGB video. Applying it to INSAT without fine-tuning
            and calibration would produce unverified meteorological artifacts.
          </p>
        </div>
      </div>

      {/* Upload Slot for Genuine File Inspection */}
      <div className="p-4 rounded border border-[var(--ff-border)] bg-[var(--ff-workspace)] space-y-3">
        <div>
          <h3 className="text-xs font-semibold text-[var(--ff-text)] uppercase tracking-wide flex items-center gap-2">
            <Upload size={14} className="text-[var(--ff-accent)]" />
            <span>INSAT-3DS HDF5 Container Inspection Slot</span>
          </h3>
          <p className="text-[11px] font-mono text-[var(--ff-text-secondary)] mt-0.5">
            If you have acquired a genuine MOSDAC INSAT-3DS TIR1 file (.h5 or .nc), upload it here.
            The backend inspects container datasets and variable structure without generating unvalidated predictions.
          </p>
        </div>

        <form onSubmit={handleUpload} className="space-y-3">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center p-5 border border-dashed border-[var(--ff-border)] hover:border-[var(--ff-accent)] rounded bg-[var(--ff-panel)] cursor-pointer transition-colors text-center"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".h5,.hdf5,.nc,.nc4"
              onChange={handleFileChange}
              className="hidden"
            />
            {file ? (
              <div className="flex items-center gap-2 text-xs font-mono font-medium text-[var(--ff-observed)]">
                <CheckCircle2 size={16} />
                <span>{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1 text-[var(--ff-text-secondary)] text-xs font-mono">
                <FileQuestion size={20} className="text-[var(--ff-text-muted)]" />
                <span>Select valid INSAT .h5 or .nc file</span>
                <span className="text-[10px] text-[var(--ff-text-muted)]">HDF5 / NetCDF metadata inspector</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !file}
            className="w-full sm:w-auto px-4 py-1.5 rounded font-medium text-xs text-black bg-[var(--ff-accent)] hover:bg-[var(--ff-accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Inspecting Container...' : 'Inspect File Structure'}
          </button>
        </form>

        {loading && <LoadingSpinner label="Parsing HDF5/NetCDF container variables..." />}
        {error && <ErrorState title="File Inspection Rejected" message={error} onRetry={() => setError(null)} />}

        {result && (
          <div className="p-3.5 rounded border border-[var(--ff-border)] bg-[var(--ff-panel)] space-y-2 text-xs font-mono">
            <div className="flex items-center gap-2 font-medium text-[var(--ff-observed)]">
              <CheckCircle2 size={15} />
              <span>Container Validated: {result.filename}</span>
            </div>
            <p className="text-[var(--ff-text)]">{result.message}</p>

            <div className="space-y-1.5 pt-2 border-t border-[var(--ff-border-subtle)]">
              <span className="text-[10px] text-[var(--ff-text-secondary)] uppercase tracking-wider">
                Discovered Variables ({result.variable_count}):
              </span>
              <div className="flex flex-wrap gap-1 pt-1">
                {result.variables.map((v) => (
                  <span
                    key={v}
                    className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--ff-workspace)] text-[var(--ff-text)] border border-[var(--ff-border)]"
                  >
                    {v}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MOSDAC Data Acquisition Guide */}
      <div className="p-3.5 rounded border border-[var(--ff-border)] bg-[var(--ff-panel)] text-xs text-[var(--ff-text-secondary)] font-mono space-y-1.5">
        <h4 className="font-semibold text-[var(--ff-text)]">MOSDAC Acquisition Guide for Future Evaluations:</h4>
        <ol className="list-decimal list-inside space-y-1 text-[11px] leading-relaxed">
          <li>Register and get institutional approval at <strong>mosdac.gov.in</strong>.</li>
          <li>Navigate to Archived Data &gt; Satellite &gt; INSAT-3DS Imager &gt; TIR1 band.</li>
          <li>Submit order for a benchmark window (1–2 days at 30-min cadence).</li>
          <li>Download via SFTP credentials or download portal once processed.</li>
        </ol>
      </div>
    </PageShell>
  );
};

export default InsatPage;
