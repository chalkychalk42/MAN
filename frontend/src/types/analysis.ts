import type { TokenMetadata } from './token';
import type { WalletScore } from './wallet';

export interface FlowNode {
  id: string;
  name: string;
  type: 'token' | 'wallet' | 'exchange' | 'unknown';
  group?: number;
}

export interface FlowLink {
  source: string;
  target: string;
  value: number;
}

export interface FlowGraph {
  nodes: FlowNode[];
  links: FlowLink[];
}

export interface AnalysisResult {
  analysis_id: string;
  token: TokenMetadata;
  wallets: WalletScore[];
  flow_graph: FlowGraph | null;
  risk_score: number | null;
  risk_factors: string[];
  ai_insights: string | null;
  wallet_count: number;
  transaction_count: number;
  started_at: string;
  completed_at: string | null;
  status: 'queued' | 'running' | 'complete' | 'error';
}

export interface AnalysisSummaryToken {
  contract_address: string;
  name: string;
  symbol: string;
  image_url: string | null;
}

export interface AnalysisSummary {
  analysis_id: string;
  status: string;
  risk_score: number | null;
  wallet_count: number;
  transaction_count: number;
  started_at: string | null;
  completed_at: string | null;
  token: AnalysisSummaryToken | null;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
}

export interface TrendingToken {
  contract_address: string;
  name: string;
  symbol: string;
  image_url: string | null;
  scan_count: number;
  max_risk: number | null;
}
