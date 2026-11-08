// TypeScript types for FrameFill frontend

export type JobStatus = 'pending' | 'running' | 'done' | 'failed' | 'cancelled';

export type InterpolationMethod = 'blend' | 'dis' | 'rife' | 'average';

export interface Metrics {
  MAE_K?: number;
  RMSE_K?: number;
  PSNR_dB?: number;
  SSIM?: number;
  MAE_dyn_K?: number;
  RMSE_dyn_K?: number;
  RMSE_cold_K?: number;
  bias_K?: number;
  dyn_fraction?: number;
  cold_fraction?: number;
}

export interface Frames {
  first?: string;       // base64 PNG data URL
  middle?: string;      // base64 PNG data URL (predicted)
  second?: string;      // base64 PNG data URL
  truth?: string;       // base64 PNG data URL
  difference?: string;  // base64 PNG data URL
}

export interface PredictResult {
  method_used: string;
  physical: boolean;
  gap_min?: number;
  frames: Frames;
  metrics?: Metrics;
  download?: string;
  warning?: string;
  notice?: string;
  frame_types?: number[];
}

export interface Job {
  id: string;
  status: JobStatus;
  progress: number;
  method: InterpolationMethod;
  gap_min: number;
  result?: PredictResult;
  error?: string;
  log?: string;
  created_at: string;
}

export interface HealthInfo {
  status: string;
  version: string;
  python?: string;
  platform?: string;
  device: string;
  rife_available: boolean;
  rife_error?: string;
  rife_dir?: string;
  fallback?: string;
}

export interface ResultRow {
  engine?: string;
  [key: string]: number | string | null | undefined;
}

export interface ResultData {
  name?: string;
  columns: string[];
  index: string[];
  data: ResultRow[];
  error?: string;
}

export type ResultsMap = Record<string, ResultData>;

export interface SequenceSummary {
  name: string;
  filename: string;
  size: number;
}

export interface SequenceDetail {
  name: string;
  n_frames: number;
  times: string[];
  frame_types: number[];  // 0 = OBSERVED, 1 = SYNTHETIC
  n_observed: number;
  n_synthetic: number;
}

export interface SequenceFrame {
  idx: number;
  frame_type: number;  // 0 = OBSERVED, 1 = SYNTHETIC
  image: string;       // base64 data URL
}

export interface InsatInspectResult {
  filename: string;
  valid_hdf5: boolean;
  variable_count: number;
  variables: string[];
  details: Record<string, { shape: number[]; dtype: string }>;
  demonstrated: boolean;
  message: string;
}

export const FRAME_TYPE_OBSERVED = 0;
export const FRAME_TYPE_SYNTHETIC = 1;

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

export interface PageContext {
  page: string;
  method_used?: string;
  physical?: boolean;
  gap_min?: number;
  metrics?: Metrics;
  frame_info?: string;
  sequence_name?: string;
  n_observed?: number;
  n_synthetic?: number;
  current_frame_idx?: number;
  current_frame_type?: number;
  results_tab?: string;
  notice?: string;
  image_description?: string;
  scene_region?: string;
  features_visible?: string;
  active_view?: string;
}
