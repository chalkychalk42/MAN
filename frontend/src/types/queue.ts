export interface QueueStatus {
  pending: number;
  processing: number;
  complete: number;
  error: number;
  workers_active: number;
}

export interface BatchStatus {
  batch_id: string;
  total: number;
  pending: number;
  processing: number;
  complete: number;
  error: number;
  submitted_at: string;
  jobs: JobSummary[];
}

export interface JobSummary {
  job_id: string;
  contract_address: string;
  status: 'pending' | 'processing' | 'complete' | 'error' | 'cancelled';
  risk_score: number | null;
  analysis_id: string;
}

export interface QueueSubmitResponse {
  batch_id: string | null;
  job_ids: string[];
  total: number;
}
