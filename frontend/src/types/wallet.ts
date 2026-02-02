export interface WalletScore {
  address: string;
  entry_time: string;
  pnl_percentage: number;
  pnl_sol: number;
  hold_duration_hours: number;
  insider_score: number;
  risk_score: number;
  cross_token_score: number | null;
  combined_insider_score: number | null;
  early_token_count: number;
  early_token_hit_rate: number | null;
  tokens_analyzed: number;
  label: string | null;
  tags: string[];
}

export interface WalletProfile {
  address: string;
  label: string | null;
  total_pnl_sol: number;
  total_pnl_usd: number;
  win_rate: number;
  total_trades: number;
  insider_score: number;
  risk_score: number;
  cross_token_score: number | null;
  combined_insider_score: number | null;
  early_token_count: number;
  early_token_hit_rate: number | null;
  tokens_analyzed: number;
  first_seen_at: string | null;
  last_active_at: string | null;
  tags: string[];
}

export interface WalletConnection {
  source_address: string;
  target_address: string;
  connection_type: string;
  strength: number;
  evidence_count: number;
}

export interface PNLDataPoint {
  date: string;
  cumulative_pnl_sol: number;
}

export interface Transaction {
  signature: string;
  timestamp: string;
  type: 'buy' | 'sell' | 'transfer';
  token_name: string | null;
  token_address: string | null;
  amount: number;
  sol_value: number;
  usd_value: number | null;
}

export interface PaginatedTransactions {
  transactions: Transaction[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}
