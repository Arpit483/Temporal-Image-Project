import React, { useState, useEffect } from 'react';
import { SplitSquareVertical, ArrowRight, Info, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import FramePanel from '../components/FramePanel';
import SliderCompare from '../components/SliderCompare';
import ColorBar from '../components/ColorBar';
import MetricsTable from '../components/MetricsTable';
import LoadingSpinner from '../components/LoadingSpinner';
import PageShell from '../components/PageShell';
import { useChat } from '../context/ChatContext';
import { fetchDemoPrediction } from '../api';
import type { PredictResult } from '../types';

export const DifferencePage: React.FC = () => {
  const { setPageContext } = useChat();
  const [result, setResult] = useState<PredictResult | null>(null);
  const [loadingDemo, setLoadingDemo] = useState<boolean>(false);

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

  useEffect(() => {
    setPageContext({
      page: 'difference',
      method_used: result?.method_used,
      metrics: result?.metrics,
      frame_info: 'Difference map inspecting pred minus truth with ±10 K diverging scale',
      scene_region: 'GOES-19 ABI Band 13 convective storm region (Equatorial South America)',
      image_description: 'Difference / Error map (Predicted minus Ground Truth) on a symmetric ±10 K diverging colormap. Orange indicates Predicted > Truth (where new convective cloud growth / storm initiation occurred that optical flow could not synthesize from scratch). Blue indicates Predicted < Truth (cloud dissipation or over-advected cloud edges). White indicates exact agreement (0 K error).',
      features_visible: 'Residual error distribution: orange marks convective initiation, blue marks cloud dissipation, white marks accurate advection.',
    });
  }, [result, setPageContext]);

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

  const hasTruth = !!(result?.frames?.truth && result?.frames?.difference);

  return (
    <PageShell>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[var(--ff-border)]">
        <div>
          <h1 className="text-lg font-semibold text-[var(--ff-text)] tracking-tight">
            Difference Map &amp; Residual Error Analysis
          </h1>
          <p className="text-xs text-[var(--ff-text-secondary)] mt-0.5">
            Spatial distribution of physical prediction errors (Kelvin) against real satellite ground truth.
          </p>
        </div>
        <ColorBar type="diff" />
      </div>

      {loadingDemo ? (
        <LoadingSpinner label="Loading real NOAA GOES-19 validation difference map..." />
      ) : !hasTruth ? (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded border border-[var(--ff-border)] bg-[var(--ff-workspace)] space-y-4">
          <SplitSquareVertical size={36} className="text-[var(--ff-text-muted)]" />
          <div>
            <h3 className="text-sm font-semibold text-[var(--ff-text)]">No Ground Truth Difference Map Available</h3>
            <p className="text-xs text-[var(--ff-text-secondary)] font-mono max-w-md mt-1">
              To inspect difference maps and full physical validation metrics, load the real validation sample triplet or upload an observed middle frame on the Predict page.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleLoadDemo}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded font-medium text-xs text-black bg-[var(--ff-accent)] hover:bg-[var(--ff-accent-hover)] transition-colors"
            >
              <Play size={13} fill="currentColor" />
              <span>Load Sample Difference Map</span>
            </button>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded font-mono text-xs text-[var(--ff-text)] bg-[var(--ff-panel)] hover:bg-[var(--ff-workspace)] border border-[var(--ff-border)] transition-colors"
            >
              <span>Predict Page</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Scientific Notice Callout */}
          <div className="p-3 rounded border-l-2 border-l-[var(--ff-accent)] border border-[var(--ff-border)] bg-[var(--ff-panel)] text-xs text-[var(--ff-text-secondary)] flex items-start gap-2.5">
            <Info size={15} className="text-[var(--ff-accent)] shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="text-[var(--ff-text)]">Physical Interpretation:</strong> Convective cloud formation and dissipation involve microphysical phase changes not governed purely by optical advection. Fast storm cores typically exhibit absolute errors up to ±10 K, while advective stratiform motion is tracked with sub-Kelvin error.
            </div>
          </div>

          {/* Triplet Difference Panels */}
          <div className="space-y-2">
            <div className="text-[11px] font-mono font-medium text-[var(--ff-text-secondary)] uppercase tracking-wider">
              Spatial Comparison (Observed vs Predicted vs Error)
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              <FramePanel
                title="Real Middle Frame"
                imageSrc={result?.frames.truth}
                type="observed"
                subtitle="Ground truth satellite observation"
              />
              <FramePanel
                title="Predicted Middle Frame"
                imageSrc={result?.frames.middle}
                type="synthetic"
                subtitle="SYNTHETIC model prediction (50/50 blend)"
              />
              <FramePanel
                title="Difference Map (Pred - Truth)"
                imageSrc={result?.frames.difference}
                type="diff"
                subtitle="Blue: Colder | Orange: Warmer"
              />
            </div>
          </div>

          {/* Interactive Split Slider & Metrics Table */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start pt-2">
            <div className="space-y-2">
              <h3 className="text-[11px] font-mono font-medium text-[var(--ff-text-secondary)] uppercase tracking-wider">
                Interactive Split Comparison
              </h3>
              <SliderCompare
                leftImage={result?.frames.truth || ''}
                rightImage={result?.frames.middle || ''}
                leftTitle="Observed Truth"
                rightTitle="Synthetic Output"
                leftType="observed"
                rightType="synthetic"
              />
            </div>

            <div className="space-y-2">
              <h3 className="text-[11px] font-mono font-medium text-[var(--ff-text-secondary)] uppercase tracking-wider">
                Quantitative Metrics (Kelvin)
              </h3>
              <MetricsTable metrics={result?.metrics} />
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
};

export default DifferencePage;
