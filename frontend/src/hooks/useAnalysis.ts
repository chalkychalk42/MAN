'use client';

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  // Mutation
  startAnalysis: (contractAddress: string) => void;
  isStarting: boolean;
  startError: Error | null;
}

export function useAnalysis(analysisId?: string): UseAnalysisReturn {
  const queryClient = useQueryClient();

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

  // GET /api/v1/analysis/{id}
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

  // Populate the store when fetched data arrives (e.g. page refresh)
  useEffect(() => {
    if (!fetchedAnalysis) return;

    const store = useAnalysisStore.getState();
    store.setTokenData(fetchedAnalysis.token);
    store.setWallets(fetchedAnalysis.wallets);

    if (fetchedAnalysis.flow_graph) {
      store.setFlows(fetchedAnalysis.flow_graph);
    }
    if (fetchedAnalysis.ai_insights) {
      store.setInsights(fetchedAnalysis.ai_insights);
    }
    if (fetchedAnalysis.risk_score !== null) {
      store.setRiskScore(fetchedAnalysis.risk_score);
    }
    if (fetchedAnalysis.risk_factors.length > 0) {
      store.setRiskFactors(fetchedAnalysis.risk_factors);
    }
    store.setStatus(fetchedAnalysis.status === 'complete' ? 'complete' : fetchedAnalysis.status === 'error' ? 'error' : 'running');
  }, [fetchedAnalysis]);

  // POST /api/v1/analysis/start
  const {
    mutate: startAnalysis,
    isPending: isStarting,
    error: startError,
  } = useMutation<{ analysis_id: string }, Error, string>({
    mutationFn: (contractAddress: string) =>
      api.startAnalysis(contractAddress),
    onSuccess: (data) => {
      const store = useAnalysisStore.getState();
      store.reset();
      store.setStatus('running');
      useAnalysisStore.setState({ currentAnalysisId: data.analysis_id });
      // Invalidate the analysis list so history picks it up
      queryClient.invalidateQueries({ queryKey: ['history'] });
    },
    onError: () => {
      useAnalysisStore.getState().setStatus('error');
    },
  });

  return {
    ...storeState,
    fetchedAnalysis,
    isLoading,
    isFetching,
    fetchError: fetchError ?? null,
    startAnalysis,
    isStarting,
    startError: startError ?? null,
  };
}
