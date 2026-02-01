import type { TokenMetadata } from './token';
import type { WalletScore } from './wallet';

export interface FlowNode {
  id: string;
  name: string;
  type: 'token' | 'wallet' | 'exchange';
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

export interface AnalysisSummary {
  analysis_id: string;
  token_name: string;
  token_symbol: string;
  contract_address: string;
  risk_score: number | null;
  wallet_count: number;
  created_at: string;
  status: string;
}
