import React, { useState, useEffect } from 'react';
import { Database, Cpu, AlertTriangle, Layers, Server } from 'lucide-react';
import PageShell from '../components/PageShell';
import { useChat } from '../context/ChatContext';
import { fetchHealth } from '../api';
import type { HealthInfo } from '../types';

interface AboutPageProps {
  health?: HealthInfo;
}

export const AboutPage: React.FC<AboutPageProps> = ({ health: initialHealth }) => {
  const { setPageContext } = useChat();
  const [health, setHealth] = useState<HealthInfo | undefined>(initialHealth);

  useEffect(() => {
    if (!health) {
      fetchHealth().then(setHealth).catch(() => {});
    }
    setPageContext({
      page: 'about',
      frame_info: 'Documentation of methodology, 50/50 blend pipeline, and operational limitations',
    });
  }, [health, setPageContext]);

  return (
    <PageShell className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="pb-3 border-b border-[var(--ff-border)]">
        <h1 className="text-lg font-semibold text-[var(--ff-text)] tracking-tight">
          About FrameFill &amp; Scientific Methodology
        </h1>
        <p className="text-xs text-[var(--ff-text-secondary)] mt-0.5">
          Temporal frame interpolation workstation for geostationary thermal-IR satellite radiometry (Problem Statement 12).
        </p>
      </div>

      {/* Processing Pipeline Section */}
      <div className="p-4 rounded border border-[var(--ff-border)] bg-[var(--ff-workspace)] space-y-3">
        <h3 className="text-xs font-semibold text-[var(--ff-text)] uppercase tracking-wide flex items-center gap-2">
          <Layers size={14} className="text-[var(--ff-accent)]" />
          <span>Interpolation Pipeline Architecture</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs">
          <div className="p-2.5 rounded bg-[var(--ff-panel)] border border-[var(--ff-border)] flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono font-medium text-[var(--ff-accent)] uppercase">
                Step 1
              </span>
              <div className="font-medium text-[var(--ff-text)] mt-0.5">Input Ingestion</div>
            </div>
            <p className="text-[11px] font-mono text-[var(--ff-text-secondary)] mt-2">
              Ingests pair of GOES-19 Ch13 frames (.nc or .npy). Calibrated BT 180–330 K. NaNs median-filled for motion vectors.
            </p>
          </div>

          <div className="p-2.5 rounded bg-[var(--ff-panel)] border border-[var(--ff-border)] flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono font-medium text-[var(--ff-observed)] uppercase">
                Step 2
              </span>
              <div className="font-medium text-[var(--ff-text)] mt-0.5">DIS Optical Flow</div>
            </div>
            <p className="text-[11px] font-mono text-[var(--ff-text-secondary)] mt-2">
              OpenCV DIS (medium). Forward and backward flow computed on 8-bit proxy, backward-warping applied to float32 BT.
            </p>
          </div>

          <div className="p-2.5 rounded bg-[var(--ff-panel)] border border-[var(--ff-border)] flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono font-medium text-[var(--ff-synthetic)] uppercase">
                Step 3
              </span>
              <div className="font-medium text-[var(--ff-text)] mt-0.5">RIFE v4.22</div>
            </div>
            <p className="text-[11px] font-mono text-[var(--ff-text-secondary)] mt-2">
              Practical-RIFE v4.22 neural model with flow scale 2.0. Single IR channel duplicated to 3ch, symmetric padding to 128 px.
            </p>
          </div>

          <div className="p-2.5 rounded bg-[var(--ff-panel)] border border-[var(--ff-border)] flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono font-medium text-[var(--ff-observed)] uppercase">
                Step 4
              </span>
              <div className="font-medium text-[var(--ff-text)] mt-0.5">50/50 Ensemble</div>
            </div>
            <p className="text-[11px] font-mono text-[var(--ff-text-secondary)] mt-2">
              0.5·DIS + 0.5·RIFE. Output values clamped to input bounds ±5 K. Saved with frame_type=1 (SYNTHETIC).
            </p>
          </div>
        </div>
      </div>

      {/* Methods Overview */}
      <div className="p-4 rounded border border-[var(--ff-border)] bg-[var(--ff-workspace)] space-y-2.5">
        <h3 className="text-xs font-semibold text-[var(--ff-text)] uppercase tracking-wide flex items-center gap-2">
          <Cpu size={14} className="text-[var(--ff-accent)]" />
          <span>Engine Comparison &amp; Physics</span>
        </h3>
        <div className="space-y-2 text-xs text-[var(--ff-text-secondary)] font-mono leading-relaxed">
          <p>
            <strong className="text-[var(--ff-text)]">B0 Linear Average:</strong> 0.5·f0 + 0.5·f1. Trivial non-motion baseline to benchmark advective improvements.
          </p>
          <p>
            <strong className="text-[var(--ff-text)]">B1 Classical DIS Flow-Warp:</strong> Bidirectional dense optical flow with half-vector backward-warping to t = +10 min.
          </p>
          <p>
            <strong className="text-[var(--ff-text)]">B3 Practical-RIFE v4.22 (Scale 2.0):</strong> Pretrained deep optical flow network. Flow scale 2.0 captures fine cloud motions (3–4 px/20 min) that scale 1.0 missed.
          </p>
          <p>
            <strong className="text-[var(--ff-text)]">B5 Fixed 50/50 Blend (Selected Method):</strong> Ensemble combining DIS edge tracking with RIFE feature continuity. Achieved lowest dynamic-pixel RMSE across all validation and test days (Day A: 2.407 K, Day B: 2.559 K, Day C: 1.876 K, Day D: 2.855 K).
          </p>
        </div>
      </div>

      {/* Data Attribution */}
      <div className="p-4 rounded border border-[var(--ff-border)] bg-[var(--ff-workspace)] space-y-2.5">
        <h3 className="text-xs font-semibold text-[var(--ff-text)] uppercase tracking-wide flex items-center gap-2">
          <Database size={14} className="text-[var(--ff-accent)]" />
          <span>Data Attribution &amp; Provenance</span>
        </h3>
        <div className="text-xs text-[var(--ff-text-secondary)] space-y-2 font-mono leading-relaxed">
          <p>
            Data courtesy of <strong>NOAA (National Oceanic and Atmospheric Administration)</strong>.
            Sensor: <strong>GOES-19 ABI L2 CMIPF, Channel 13</strong> (clean thermal-IR window, ~10.3 µm), calibrated brightness temperature in Kelvin.
            Retrieved from the public AWS Open Data bucket <code>noaa-goes19/ABI-L2-CMIPF/</code>.
          </p>
          <div className="p-2.5 rounded bg-[var(--ff-panel)] border border-[var(--ff-border)] text-[var(--ff-text-secondary)]">
            <strong>Disclosure:</strong> While NOAA satellite data is public domain, all intermediate predicted frames are synthetic model estimates. Outputs must always retain the SYNTHETIC indicator.
          </div>
        </div>
      </div>

      {/* Operational Limitations */}
      <div className="p-4 rounded border border-[var(--ff-border)] bg-[var(--ff-panel)] space-y-2.5">
        <h3 className="text-xs font-semibold text-[var(--ff-synthetic)] uppercase tracking-wide flex items-center gap-2">
          <AlertTriangle size={15} />
          <span>Documented Limitations &amp; Operational Boundaries</span>
        </h3>
        <ul className="list-disc list-inside space-y-1.5 text-xs font-mono text-[var(--ff-text-secondary)] leading-relaxed">
          <li>
            <strong className="text-[var(--ff-text)]">SYNTHETIC Frames are Estimates:</strong> Frames flagged with <code>frame_type=1</code> are mathematical approximations and must not be ingested into operational forecasting models.
          </li>
          <li>
            <strong className="text-[var(--ff-text)]">Advection vs Convective Growth:</strong> Optical flow assumes brightness constancy and cannot synthesize spontaneous convective cloud development or vertical collapse, causing errors up to ±10 K near storm cores.
          </li>
          <li>
            <strong className="text-[var(--ff-text)]">Spatial Scope:</strong> Validated on 512×512 tropical and midlatitude storm scenes. Unverified across full global disc.
          </li>
          <li>
            <strong className="text-[var(--ff-text)]">INSAT-3DS Scope:</strong> No INSAT data was available for quantitative evaluation; no INSAT capability is claimed.
          </li>
        </ul>
      </div>

      {/* Runtime Environment Diagnostic */}
      {health && (
        <div className="p-3 rounded border border-[var(--ff-border)] bg-[var(--ff-workspace)] text-xs font-mono text-[var(--ff-text-secondary)] flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-1.5 text-[var(--ff-text)]">
            <Server size={13} className="text-[var(--ff-accent)]" />
            <span>Host Environment:</span>
          </div>
          <div>Status: <span className="text-[var(--ff-observed)] font-semibold">{health.status}</span></div>
          <div>Version: <span className="text-[var(--ff-text)]">{health.version}</span></div>
          <div>Device: <span className="text-[var(--ff-text)]">{health.device.toUpperCase()}</span></div>
          <div>RIFE Engine: <span style={{ color: health.rife_available ? 'var(--ff-observed)' : 'var(--ff-synthetic)' }}>
            {health.rife_available ? 'Available' : 'DIS Fallback'}
          </span></div>
          {health.python && <div>Python: <span className="text-[var(--ff-text)]">{health.python}</span></div>}
        </div>
      )}
    </PageShell>
  );
};

export default AboutPage;
