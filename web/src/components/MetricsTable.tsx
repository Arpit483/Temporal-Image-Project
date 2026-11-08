import React from 'react';
import { Info } from 'lucide-react';
import type { Metrics } from '../types';

interface MetricsTableProps {
  metrics?: Metrics;
  className?: string;
}

export const MetricsTable: React.FC<MetricsTableProps> = ({ metrics, className = '' }) => {
  if (!metrics) {
    return (
      <div className={`text-xs font-mono text-[var(--ff-text-muted)] italic p-3 text-center rounded-sm border border-[var(--ff-border)] bg-[var(--ff-workspace)] ${className}`}>
        No ground truth frame provided. Supply an observed middle frame to calculate quantitative validation metrics.
      </div>
    );
  }

  const items = [
    {
      key: 'MAE_K',
      label: 'MAE',
      value: metrics.MAE_K,
      unit: 'K',
      desc: 'Mean Absolute Error in kelvin over all valid pixels',
    },
    {
      key: 'RMSE_K',
      label: 'RMSE',
      value: metrics.RMSE_K,
      unit: 'K',
      desc: 'Root Mean Squared Error in kelvin over all valid pixels',
    },
    {
      key: 'PSNR_dB',
      label: 'PSNR',
      value: metrics.PSNR_dB,
      unit: 'dB',
      desc: 'Peak Signal-to-Noise Ratio computed with fixed 150 K temperature span',
    },
    {
      key: 'SSIM',
      label: 'SSIM',
      value: metrics.SSIM,
      unit: '',
      desc: 'Structural Similarity Index (normalized image, win_size 7)',
    },
    {
      key: 'MAE_dyn_K',
      label: 'MAE (dynamic)',
      value: metrics.MAE_dyn_K,
      unit: 'K',
      desc: 'MAE evaluated on dynamic pixels only (|f0 - f1| > 3 K, 3x3 smoothed)',
    },
    {
      key: 'RMSE_dyn_K',
      label: 'RMSE (dynamic)',
      value: metrics.RMSE_dyn_K,
      unit: 'K',
      desc: 'Primary benchmark metric: dynamic-pixel RMSE (avoids rewarding static background)',
      primary: true,
    },
    {
      key: 'RMSE_cold_K',
      label: 'RMSE (cold cloud)',
      value: metrics.RMSE_cold_K,
      unit: 'K',
      desc: 'RMSE evaluated on cold clouds (ground truth < 235 K convective tops)',
    },
    {
      key: 'bias_K',
      label: 'Mean Bias',
      value: metrics.bias_K,
      unit: 'K',
      desc: 'Average signed difference (predicted minus ground truth)',
    },
    {
      key: 'dyn_fraction',
      label: 'Dynamic Pixels',
      value: metrics.dyn_fraction !== undefined ? metrics.dyn_fraction * 100 : undefined,
      unit: '%',
      desc: 'Fraction of frame considered dynamic (|f0 - f1| > 3 K)',
    },
    {
      key: 'cold_fraction',
      label: 'Cold Cloud Fraction',
      value: metrics.cold_fraction !== undefined ? metrics.cold_fraction * 100 : undefined,
      unit: '%',
      desc: 'Fraction of frame with ground truth brightness temperature < 235 K',
    },
  ];

  return (
    <div className={`rounded-sm border border-[var(--ff-border)] bg-[var(--ff-workspace)] overflow-hidden ${className}`}>
      <div className="px-3 py-1.5 bg-[var(--ff-panel)] border-b border-[var(--ff-border)] flex items-center justify-between">
        <h4 className="text-[11px] font-mono font-semibold text-[var(--ff-text)] uppercase tracking-wider">
          Validation Metrics
        </h4>
        <span className="text-[10px] text-[var(--ff-text-secondary)] font-mono">
          Evaluated vs Ground Truth
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-[var(--ff-panel-subtle)] text-[var(--ff-text-secondary)] border-b border-[var(--ff-border)]">
            <tr>
              <th className="py-1.5 px-2.5 font-semibold text-[10.5px]">Metric</th>
              <th className="py-1.5 px-2.5 font-semibold text-right text-[10.5px]">Value</th>
              <th className="py-1.5 px-2.5 font-semibold text-[var(--ff-text-muted)] text-[10.5px]">Unit</th>
              <th className="py-1.5 px-2.5 font-semibold text-[var(--ff-text-muted)] text-[10.5px] hidden sm:table-cell">
                Description
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--ff-border-subtle)] text-[var(--ff-text)]">
            {items.map((item) => (
              <tr
                key={item.key}
                className={`hover:bg-[var(--ff-panel-subtle)] transition-colors ${
                  item.primary ? 'bg-[var(--ff-panel)]/40 border-l-2 border-l-[var(--ff-accent)] font-medium' : ''
                }`}
              >
                <td className="py-1 px-2.5 flex items-center gap-1.5 text-[11px]">
                  <span>{item.label}</span>
                  <span title={item.desc} className="text-[var(--ff-text-muted)] hover:text-[var(--ff-text-secondary)] cursor-help">
                    <Info size={11} />
                  </span>
                </td>
                <td className={`py-1 px-2.5 text-right font-mono text-[11px] tabular-nums ${item.primary ? 'text-[var(--ff-accent)] font-semibold' : 'text-[var(--ff-text)]'}`}>
                  {item.value !== undefined && item.value !== null && !isNaN(item.value)
                    ? item.value.toFixed(3)
                    : 'N/A'}
                </td>
                <td className="py-1 px-2.5 text-[var(--ff-text-muted)] text-[10.5px]">{item.unit || '—'}</td>
                <td className="py-1 px-2.5 text-[var(--ff-text-secondary)] font-sans text-[10.5px] hidden sm:table-cell">
                  {item.desc}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-2.5 py-1 bg-[var(--ff-panel-subtle)] border-t border-[var(--ff-border-subtle)] text-[9.5px] font-mono text-[var(--ff-text-muted)]">
        Fixed normalization: 180.0–330.0 K · Dynamic threshold: |ΔT| &gt; 3.0 K with 3×3 median filter.
      </div>
    </div>
  );
};

export default MetricsTable;
