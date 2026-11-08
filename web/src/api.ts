// API client functions for FrameFill backend

import type {
  Job,
  HealthInfo,
  PredictResult,
  ResultData,
  ResultsMap,
  SequenceSummary,
  SequenceDetail,
  SequenceFrame,
  InsatInspectResult,
} from './types';

const BASE = '/api';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const err = await res.json();
      if (err.detail) msg = err.detail;
      else if (err.message) msg = err.message;
    } catch {
      const text = await res.text().catch(() => res.statusText);
      if (text) msg = text;
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

// Health
export async function fetchHealth(): Promise<HealthInfo> {
  const res = await fetch(`${BASE}/health`);
  return handleResponse<HealthInfo>(res);
}

// Jobs
export async function fetchJobs(): Promise<Job[]> {
  const res = await fetch(`${BASE}/jobs`);
  return handleResponse<Job[]>(res);
}

export async function fetchJob(id: string): Promise<Job> {
  const res = await fetch(`${BASE}/jobs/${id}`);
  return handleResponse<Job>(res);
}

export async function deleteJob(id: string): Promise<{ cancelled: boolean; job_id: string }> {
  const res = await fetch(`${BASE}/jobs/${id}`, { method: 'DELETE' });
  return handleResponse<{ cancelled: boolean; job_id: string }>(res);
}

export interface CreateJobParams {
  first: File;
  second: File;
  truth?: File;
  gap_min: number;
  method: string;
}

export async function createJob(params: CreateJobParams): Promise<{ job_id: string; status: string }> {
  const fd = new FormData();
  fd.append('first', params.first);
  fd.append('second', params.second);
  if (params.truth) fd.append('truth', params.truth);
  fd.append('gap_min', String(params.gap_min));
  fd.append('method', params.method);
  const res = await fetch(`${BASE}/jobs`, { method: 'POST', body: fd });
  return handleResponse<{ job_id: string; status: string }>(res);
}

// Legacy predict (direct, synchronous)
export interface PredictParams {
  first: File;
  second: File;
  truth?: File;
  gap_min: number;
  method: string;
}

export async function predict(params: PredictParams): Promise<PredictResult> {
  const fd = new FormData();
  fd.append('first', params.first);
  fd.append('second', params.second);
  if (params.truth) fd.append('truth', params.truth);
  fd.append('gap_min', String(params.gap_min));
  fd.append('method', params.method);
  const res = await fetch(`${BASE}/predict`, { method: 'POST', body: fd });
  return handleResponse<PredictResult>(res);
}

// Downloads
export function downloadUrl(id: string): string {
  return `${BASE}/download/${id}`;
}

export function gifUrl(id: string): string {
  return `${BASE}/download/${id}/gif`;
}

export function zipUrl(id: string): string {
  return `${BASE}/download/${id}/zip`;
}

// Results
export async function fetchResults(): Promise<ResultsMap> {
  const res = await fetch(`${BASE}/results`);
  return handleResponse<ResultsMap>(res);
}

export async function fetchResult(name: string): Promise<ResultData> {
  const res = await fetch(`${BASE}/results/${name}`);
  return handleResponse<ResultData>(res);
}

// Sequences
export async function fetchSequences(): Promise<SequenceSummary[]> {
  const res = await fetch(`${BASE}/sequences`);
  return handleResponse<SequenceSummary[]>(res);
}

export async function fetchSequence(name: string): Promise<SequenceDetail> {
  const res = await fetch(`${BASE}/sequences/${name}`);
  return handleResponse<SequenceDetail>(res);
}

export async function fetchSequenceFrame(name: string, idx: number): Promise<SequenceFrame> {
  const res = await fetch(`${BASE}/sequences/${name}/frame/${idx}`);
  return handleResponse<SequenceFrame>(res);
}

// Demo & Sample Triplet
export async function fetchDemoPrediction(): Promise<PredictResult> {
  const res = await fetch(`${BASE}/demo/prediction`);
  return handleResponse<PredictResult>(res);
}

export async function fetchDemoTripletFiles(): Promise<{ first: File; second: File; truth: File }> {
  const [b0, bTruth, b20] = await Promise.all([
    fetch(`${BASE}/examples/triplet/file/t0_0000.nc`).then((r) => r.blob()),
    fetch(`${BASE}/examples/triplet/file/truth_mid_0010.nc`).then((r) => r.blob()),
    fetch(`${BASE}/examples/triplet/file/t20_0020.nc`).then((r) => r.blob()),
  ]);
  return {
    first: new File([b0], 'goes19_t00_0000.nc', { type: 'application/x-netcdf' }),
    second: new File([b20], 'goes19_t20_0020.nc', { type: 'application/x-netcdf' }),
    truth: new File([bTruth], 'goes19_truth_mid_0010.nc', { type: 'application/x-netcdf' }),
  };
}

// INSAT inspection
export async function inspectInsat(file: File): Promise<InsatInspectResult> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(`${BASE}/insat/inspect`, { method: 'POST', body: fd });
  return handleResponse<InsatInspectResult>(res);
}

// AI Chat (Explainable AI via OpenRouter)
export async function sendChatMessage(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  context: Record<string, unknown>
): Promise<string> {
  const res = await fetch(`${BASE}/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, context }),
  });
  const data = await handleResponse<{ reply: string }>(res);
  return data.reply;
}
