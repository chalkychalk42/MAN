'use client';

import { useQuery } from '@tanstack/react-query';
import { useAnalysisStore } from '@/stores/useAnalysisStore';
import { api } from '@/lib/api';
import type { AnalysisResult } from '@/types/analysis';
import type { TokenMetadata } from '@/types/token';
import type { WalletScore } from '@/types/wallet';
import type { FlowGraph } from '@/types/analysis';

interface UseAnalysisReturn {
  // Store state
  currentAnalysisId: string | null;
  status: 'idle' | 'running' | 'complete' | 'error';
  tokenData: TokenMetadata | null;
  wallets: WalletScore[];
  flows: FlowGraph | null;
  insights: string | null;
  riskScore: number | null;
  riskFactors: string[];
  // Query state
  fetchedAnalysis: AnalysisResult | undefined;
  isLoading: boolean;
  isFetching: boolean;
  fetchError: Error | null;
}

export function useAnalysis(analysisId?: string): UseAnalysisReturn {
  const storeState = useAnalysisStore((state) => ({
    currentAnalysisId: state.currentAnalysisId,
    status: state.status,
    tokenData: state.tokenData,
    wallets: state.wallets,
    flows: state.flows,
    insights: state.insights,
    riskScore: state.riskScore,
    riskFactors: state.riskFactors,
  }));

  const {
    data: fetchedAnalysis,
    isLoading,
    isFetching,
    error: fetchError,
  } = useQuery<AnalysisResult, Error>({
    queryKey: ['analysis', analysisId],
    queryFn: () => api.getAnalysis(analysisId!),
    enabled: !!analysisId,
  });

  return {
    ...storeState,
    fetchedAnalysis,
    isLoading,
    isFetching,
    fetchError: fetchError ?? null,
  };
}
