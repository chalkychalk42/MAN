import type { AnalysisResult, AnalysisSummary } from '@/types/analysis';
import type { TokenMetadata } from '@/types/token';
import type { WalletProfile, WalletConnection } from '@/types/wallet';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function fetcher<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  if (!response.ok) {
    let errorData: unknown;
    try {
      errorData = await response.json();
    } catch {
      errorData = await response.text();
    }
    throw new ApiError(
      `API request failed: ${response.status} ${response.statusText}`,
      response.status,
      errorData
    );
  }

  return response.json() as Promise<T>;
}

export const api = {
  // ── Analysis ──────────────────────────────────────────────────────────

  startAnalysis: (contractAddress: string) =>
    fetcher<{ analysis_id: string }>('/api/v1/analysis/start', {
      method: 'POST',
      body: JSON.stringify({ contract_address: contractAddress }),
    }),

  getAnalysis: (id: string) =>
    fetcher<AnalysisResult>(`/api/v1/analysis/${id}`),

  getAnalysisStatus: (id: string) =>
    fetcher<{ status: string; progress: number }>(
      `/api/v1/analysis/${id}/status`
    ),

  cancelAnalysis: (id: string) =>
    fetcher<{ success: boolean }>(`/api/v1/analysis/${id}`, {
      method: 'DELETE',
    }),

  // ── Wallets ───────────────────────────────────────────────────────────

  getWallet: (address: string) =>
    fetcher<WalletProfile>(`/api/v1/wallets/${address}`),

  getWalletTransactions: (
    address: string,
    limit?: number,
    offset?: number
  ) => {
    const params = new URLSearchParams();
    if (limit !== undefined) params.set('limit', String(limit));
    if (offset !== undefined) params.set('offset', String(offset));
    const qs = params.toString();
    return fetcher<unknown[]>(
      `/api/v1/wallets/${address}/transactions${qs ? `?${qs}` : ''}`
    );
  },

  getWalletConnections: (address: string) =>
    fetcher<WalletConnection[]>(`/api/v1/wallets/${address}/connections`),

  getWalletPnl: (address: string, period?: string) => {
    const params = new URLSearchParams();
    if (period) params.set('period', period);
    const qs = params.toString();
    return fetcher<{ pnl_sol: number; pnl_usd: number }>(
      `/api/v1/wallets/${address}/pnl${qs ? `?${qs}` : ''}`
    );
  },

  // ── Tokens ────────────────────────────────────────────────────────────

  getToken: (contractAddress: string) =>
    fetcher<TokenMetadata>(`/api/v1/tokens/${contractAddress}`),

  // ── History ───────────────────────────────────────────────────────────

  getHistory: (q?: string, limit?: number, offset?: number) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (limit !== undefined) params.set('limit', String(limit));
    if (offset !== undefined) params.set('offset', String(offset));
    const qs = params.toString();
    return fetcher<AnalysisSummary[]>(
      `/api/v1/history${qs ? `?${qs}` : ''}`
    );
  },

  getTrending: () =>
    fetcher<AnalysisSummary[]>('/api/v1/history/trending'),
};

export { ApiError };
