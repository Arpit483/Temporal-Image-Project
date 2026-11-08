import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { BarChart3, AlertTriangle } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorState from '../components/ErrorState';
import PageShell from '../components/PageShell';
import { useChat } from '../context/ChatContext';
import { fetchResults } from '../api';
import type { ResultsMap } from '../types';

export const ResultsPage: React.FC = () => {
  const { setPageContext } = useChat();
  const [results, setResults] = useState<ResultsMap | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'20to10' | '60to30' | 'scales'>('20to10');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const data = await fetchResults();
        if (mounted) setResults(data);
      } catch (err: any) {
        if (mounted) setError(err.message || 'Failed to fetch result CSVs');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setPageContext({
      page: 'results',
      results_tab: activeTab,
      frame_info: `Benchmark results tab: ${activeTab} with real CSV evaluation logs`,
      image_description: 'Benchmark validation charts and metrics tables comparing Linear Average, DIS Optical Flow, RIFE v4.22 neural network, and 50/50 Blend across hold-out GOES-19 sequences.',
      scene_region: 'GOES-19 ABI Channel 13 hold-out benchmark days (DOY 295, Day A)',
      features_visible: 'Quantitative metrics (MAE, RMSE, Dynamic-RMSE, SSIM, PSNR) evaluating temporal interpolation error against real ground truth.',
    });
  }, [activeTab, setPageContext]);

  if (loading) return <LoadingSpinner label="Loading real benchmark results from CSV logs..." />;
  if (error) return <ErrorState title="Could not load results" message={error} onRetry={() => window.location.reload()} />;

  const getChartData20to10 = () => {
    if (!results) return [];

    const datasets = [
      {
        name: 'Day A (Val)',
        baseCsv: 'dayA_results',
        blendCsv: 'dayA_scale_blend',
      },
      {
        name: 'Day B (Val)',
        baseCsv: 'dayB_results',
        blendCsv: 'dayB_scale_blend',
      },
      {
        name: 'Day C (Quiet)',
        baseCsv: 'dayC_C_results',
        blendCsv: 'dayC_C_results',
      },
      {
        name: 'Day D (Stormy)',
        baseCsv: 'dayD_D_results',
        blendCsv: 'dayD_D_results',
      },
    ];

    return datasets.map((d) => {
      const entry: any = { name: d.name };
      const baseData = results[d.baseCsv]?.data || [];
      const blendData = results[d.blendCsv]?.data || [];

      // Average (B0)
      const b0Row = baseData.find((r) => {
        const eng = String(r.engine || '').toLowerCase();
        return eng === 'b0' || eng === 'b0 blend' || eng.includes('average');
      });
      if (b0Row) {
        entry['Average'] = Number(b0Row.RMSE_dyn ?? b0Row.RMSE_dyn_K);
      }

      // DIS Flow (B1)
      const b1Row = (blendData.length ? blendData : baseData).find((r) => {
        const eng = String(r.engine || '').toLowerCase();
        return eng === 'b1' || eng === 'b1 dis' || (eng.includes('dis') && !eng.includes('blend'));
      });
      if (b1Row) {
        entry['DIS Flow'] = Number(b1Row.RMSE_dyn ?? b1Row.RMSE_dyn_K);
      }

      // RIFE s2.0 (B3)
      const b3Row = blendData.find((r) => {
        const eng = String(r.engine || '').toLowerCase();
        return (eng.includes('b3') && eng.includes('s2.0')) || eng === 'b3 fixed';
      }) || baseData.find((r) => String(r.engine || '').toLowerCase().includes('b3'));
      if (b3Row) {
        entry['RIFE s2.0'] = Number(b3Row.RMSE_dyn ?? b3Row.RMSE_dyn_K);
      }

      // Blend (B5)
      const blendRow = blendData.find((r) => {
        const eng = String(r.engine || '').toLowerCase();
        return eng.includes('blend') && (eng.includes('b1+b3') || eng.includes('s2.0')) && !eng.startsWith('b0');
      });
      if (blendRow) {
        entry['Blend (50/50)'] = Number(blendRow.RMSE_dyn ?? blendRow.RMSE_dyn_K);
      }

      return entry;
    });
  };

  const getChartData60to30 = () => {
    if (!results) return [];

    const datasets = [
      { key: 'dayA_60to30_results', name: 'Day A (60→30m Val)' },
      { key: 'dayB_60to30_results', name: 'Day B (60→30m Val)' },
      { key: 'dayC_C60_results', name: 'Day C (60→30m Quiet)' },
      { key: 'dayD_D60_results', name: 'Day D (60→30m Stormy)' },
    ];

    return datasets.map((d) => {
      const csv = results[d.key];
      const entry: any = { name: d.name };
      if (csv?.data) {
        csv.data.forEach((row) => {
          const eng = String(row.engine || '').toLowerCase();
          const val = Number(row.RMSE_dyn ?? row.RMSE_dyn_K);
          if (!isNaN(val)) {
            if (eng.includes('b0 blend') || eng === 'b0' || eng.includes('average')) {
              entry['Average'] = val;
            } else if (eng.includes('blend') && eng.includes('s2.0') && !eng.startsWith('b0')) {
              entry['Blend (50/50)'] = val;
            } else if (eng.includes('b3') && eng.includes('s2.0')) {
              entry['RIFE s2.0'] = val;
            } else if (eng.includes('b1') || eng.includes('dis')) {
              entry['DIS Flow'] = val;
            }
          }
        });
      }
      return entry;
    });
  };

  const renderTable = (csvName: string, title: string, roleLabel: string) => {
    const csv = results?.[csvName];
    if (!csv || !csv.data || csv.data.length === 0) return null;

    const cols = ['engine', ...csv.columns.filter((c) => c !== 'engine')];

    return (
      <div className="rounded border border-[var(--ff-border)] bg-[var(--ff-workspace)] overflow-hidden">
        <div className="px-3 py-2 bg-[var(--ff-panel)] border-b border-[var(--ff-border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-medium text-[var(--ff-text)] text-xs">{title}</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono text-[var(--ff-text-secondary)] border border-[var(--ff-border)]">
              {roleLabel}
            </span>
          </div>
          <span className="text-[var(--ff-text-muted)] font-mono text-[10px]">{csvName}.csv</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[var(--ff-panel-subtle)] text-[var(--ff-text-secondary)] border-b border-[var(--ff-border)]">
              <tr>
                {cols.map((col) => (
                  <th key={col} className="py-1.5 px-2.5 font-semibold text-[11px]">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--ff-border-subtle)] text-[var(--ff-text)]">
              {csv.data.map((row, i) => {
                const isBlend = String(row.engine || '').toLowerCase().includes('blend');
                return (
                  <tr
                    key={i}
                    className={`hover:bg-[var(--ff-panel-subtle)] transition-colors ${
                      isBlend ? 'bg-[var(--ff-panel)]/40 font-medium text-[var(--ff-accent)] border-l-2 border-l-[var(--ff-accent)]' : ''
                    }`}
                  >
                    {cols.map((col) => {
                      const val = row[col];
                      const formatted =
                        typeof val === 'number'
                          ? val.toFixed(3)
                          : val !== null && val !== undefined
                          ? String(val)
                          : '—';
                      return (
                        <td key={col} className="py-1.5 px-2.5 whitespace-nowrap text-[11px]">
                          {formatted}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <PageShell>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[var(--ff-border)]">
        <div>
          <h1 className="text-lg font-semibold text-[var(--ff-text)] tracking-tight">
            Experimental Benchmark Evaluation
          </h1>
          <p className="text-xs text-[var(--ff-text-secondary)] mt-0.5">
            Empirical validation results loaded from repository CSV logs across hold-out GOES-19 observation days.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-1 p-0.5 bg-[var(--ff-panel)] border border-[var(--ff-border)] rounded self-start sm:self-auto text-xs">
          <button
            onClick={() => setActiveTab('20to10')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              activeTab === '20to10'
                ? 'bg-[var(--ff-workspace)] text-[var(--ff-accent)] border border-[var(--ff-border)]'
                : 'text-[var(--ff-text-secondary)] hover:text-[var(--ff-text)]'
            }`}
          >
            20 → 10 min (Primary)
          </button>
          <button
            onClick={() => setActiveTab('60to30')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              activeTab === '60to30'
                ? 'bg-[var(--ff-workspace)] text-[var(--ff-accent)] border border-[var(--ff-border)]'
                : 'text-[var(--ff-text-secondary)] hover:text-[var(--ff-text)]'
            }`}
          >
            60 → 30 min (Stress)
          </button>
          <button
            onClick={() => setActiveTab('scales')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              activeTab === 'scales'
                ? 'bg-[var(--ff-workspace)] text-[var(--ff-accent)] border border-[var(--ff-border)]'
                : 'text-[var(--ff-text-secondary)] hover:text-[var(--ff-text)]'
            }`}
          >
            RIFE Scale Ablations
          </button>
        </div>
      </div>

      {/* Main Chart Section */}
      <div className="p-4 rounded border border-[var(--ff-border)] bg-[var(--ff-workspace)] space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold text-[var(--ff-text)] uppercase tracking-wide flex items-center gap-2">
              <BarChart3 size={15} className="text-[var(--ff-accent)]" />
              <span>Dynamic-Pixel RMSE (Kelvin) — Lower is Better</span>
            </h3>
            <p className="text-[11px] font-mono text-[var(--ff-text-secondary)] mt-0.5">
              Comparison across Linear Average, DIS Optical Flow, RIFE v4.22 (s2.0), and 50/50 Blend.
            </p>
          </div>
          <span className="text-[10px] font-mono text-[var(--ff-text-muted)]">Units: Kelvin (K)</span>
        </div>

        <div className="h-72 w-full pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={activeTab === '60to30' ? getChartData60to30() : getChartData20to10()}
              margin={{ top: 10, right: 15, left: -10, bottom: 15 }}
            >
              <CartesianGrid strokeDasharray="2 2" stroke="var(--ff-border-subtle)" />
              <XAxis dataKey="name" stroke="var(--ff-text-secondary)" fontSize={11} tickLine={false} />
              <YAxis stroke="var(--ff-text-secondary)" fontSize={11} tickLine={false} domain={[0, 'auto']} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--ff-workspace)',
                  borderColor: 'var(--ff-border)',
                  borderRadius: 4,
                  fontSize: 11,
                  fontFamily: 'IBM Plex Mono, monospace',
                  color: 'var(--ff-text)',
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8, fontFamily: 'IBM Plex Mono, monospace' }} />
              <Bar dataKey="Average" fill="#D97757" name="Average Baseline" radius={[2, 2, 0, 0]} />
              <Bar dataKey="DIS Flow" fill="#65BFA9" name="DIS Flow-warp" radius={[2, 2, 0, 0]} />
              <Bar dataKey="RIFE s2.0" fill="#E9AC48" name="RIFE v4.22 (s2.0)" radius={[2, 2, 0, 0]} />
              <Bar dataKey="Blend (50/50)" fill="#6CA6D9" name="50/50 Blend (Best)" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabular Data Grid */}
      {activeTab === '20to10' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {renderTable('dayA_results', 'Day A (DOY 295, 22 Oct 2024)', 'Validation Hold-out')}
          {renderTable('dayB_results', 'Day B (DOY 292, 19 Oct 2024)', 'Validation Hold-out')}
          {renderTable('dayC_C_results', 'Day C (Quiet Domain)', 'Clean Test')}
          {renderTable('dayD_D_results', 'Day D (Deep Convection, ~33% Cold Cloud)', 'Clean Test')}
        </div>
      )}

      {activeTab === '60to30' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {renderTable('dayC_C60_results', 'Day C (60 → 30 min, Quiet)', 'Cadence Stress')}
          {renderTable('dayD_D60_results', 'Day D (60 → 30 min, Stormy)', 'Cadence Stress')}
          {renderTable('dayA_60to30_results', 'Day A (60 → 30 min, Validation)', 'Cadence Stress')}
          {renderTable('dayB_60to30_results', 'Day B (60 → 30 min, Validation)', 'Cadence Stress')}
        </div>
      )}

      {activeTab === 'scales' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {renderTable('dayA_scale_blend', 'Day A Scale Ablation & 50/50 Blend', 'Ablation Log')}
          {renderTable('dayB_scale_blend', 'Day B Scale Ablation & 50/50 Blend', 'Ablation Log')}
        </div>
      )}

      {/* Scientific Findings & Limitations Callout */}
      <div className="p-3.5 rounded border border-[var(--ff-border)] bg-[var(--ff-panel)] text-xs text-[var(--ff-text-secondary)] space-y-2">
        <div className="flex items-center gap-2 font-medium text-[var(--ff-synthetic)] text-xs">
          <AlertTriangle size={15} />
          <span>Scientific Findings &amp; Documented Constraints</span>
        </div>
        <ul className="list-disc list-inside space-y-1 font-mono text-[11px] leading-relaxed">
          <li>
            <strong className="text-[var(--ff-text)]">Blend Performance:</strong> 50/50 blend of DIS flow-warp and RIFE s2.0 consistently outperforms DIS alone on all evaluation days (Day A: 2.407 K, Day B: 2.559 K, Day C: 1.876 K, Day D: 2.855 K dynamic RMSE).
          </li>
          <li>
            <strong className="text-[var(--ff-text)]">Convective Limits:</strong> Optical advection cannot synthesize spontaneous convective cell initiation or destruction.
          </li>
          <li>
            <strong className="text-[var(--ff-text)]">INSAT-3DS Scope:</strong> INSAT radiometer data is not included or demonstrated; validation is strictly NOAA GOES ABI.
          </li>
          <li>
            <strong className="text-[var(--ff-text)]">Scale Calibration:</strong> Pretrained RIFE at scale 1.0 struggled with sub-pixel satellite motions; scale 2.0 was selected to resolve thermal gradients accurately.
          </li>
        </ul>
      </div>
    </PageShell>
  );
};

export default ResultsPage;
