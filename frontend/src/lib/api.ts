import type { AnalysisResult, AnalysisSummary, PaginatedResponse, TrendingToken } from '@/types/analysis';
import type { TokenMetadata } from '@/types/token';
import type { WalletProfile, WalletConnection, PNLDataPoint, PaginatedTransactions } from '@/types/wallet';

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
    params?: { page?: number; limit?: number }
  ) => {
    const searchParams = new URLSearchParams();
    if (params?.page !== undefined) searchParams.set('page', String(params.page));
    if (params?.limit !== undefined) searchParams.set('limit', String(params.limit));
    const qs = searchParams.toString();
    return fetcher<PaginatedTransactions>(
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

  getWalletPnlHistory: (address: string, period?: string) => {
    const params = new URLSearchParams();
    if (period) params.set('period', period);
    const qs = params.toString();
    return fetcher<PNLDataPoint[]>(
      `/api/v1/wallets/${address}/pnl/history${qs ? `?${qs}` : ''}`
    );
  },

  // ── Tokens ────────────────────────────────────────────────────────────

  getToken: (contractAddress: string) =>
    fetcher<TokenMetadata>(`/api/v1/tokens/${contractAddress}`),

  getTokenHolders: (
    contractAddress: string,
    params?: { limit?: number; offset?: number }
  ) => {
    const searchParams = new URLSearchParams();
    if (params?.limit !== undefined) searchParams.set('limit', String(params.limit));
    if (params?.offset !== undefined) searchParams.set('offset', String(params.offset));
    const qs = searchParams.toString();
    return fetcher<PaginatedResponse<WalletProfile>>(
      `/api/v1/tokens/${contractAddress}/holders${qs ? `?${qs}` : ''}`
    );
  },

  // ── History ───────────────────────────────────────────────────────────

  getHistory: (params?: { query?: string; limit?: number; offset?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.query) searchParams.set('q', params.query);
    if (params?.limit !== undefined) searchParams.set('limit', String(params.limit));
    if (params?.offset !== undefined) searchParams.set('offset', String(params.offset));
    const qs = searchParams.toString();
    return fetcher<PaginatedResponse<AnalysisSummary>>(
      `/api/v1/history${qs ? `?${qs}` : ''}`
    );
  },

  getTrending: () =>
    fetcher<TrendingToken[]>('/api/v1/history/trending'),

  // ── Health ────────────────────────────────────────────────────────────

  getHealth: () =>
    fetcher<{ status: string; version: string; uptime: number }>(
      '/api/v1/health'
    ),
};

export { ApiError };
