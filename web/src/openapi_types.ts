// Auto-generated from FastAPI OpenAPI schema
// Do not edit directly

export interface Body_inspect_insat_file_api_insat_inspect_post {
  file: string;
}

export interface Body_predict_api_predict_post {
  first: string;
  second: string;
  truth?: any;
  gap_min?: number;
  method?: string;
}

export interface Body_submit_job_api_jobs_post {
  first: string;
  second: string;
  truth?: any;
  gap_min?: number;
  method?: string;
}

export interface HTTPValidationError {
  detail?: any[];
}

export interface ValidationError {
  loc: any[];
  msg: string;
  type: string;
  input?: any;
  ctx?: any;
}
