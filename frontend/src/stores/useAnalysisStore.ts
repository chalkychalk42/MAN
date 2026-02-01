import { create } from 'zustand';
import type { TokenMetadata } from '@/types/token';
import type { WalletScore } from '@/types/wallet';
import type { FlowGraph } from '@/types/analysis';
import { api } from '@/lib/api';

type AnalysisStatus = 'idle' | 'running' | 'complete' | 'error';

interface AnalysisState {
  currentAnalysisId: string | null;
  status: AnalysisStatus;
  tokenData: TokenMetadata | null;
  wallets: WalletScore[];
  flows: FlowGraph | null;
  insights: string | null;
  riskScore: number | null;
  riskFactors: string[];
}

interface AnalysisActions {
  startAnalysis: (contractAddress: string) => Promise<void>;
  setTokenData: (token: TokenMetadata) => void;
  addWallet: (wallet: WalletScore) => void;
  setWallets: (wallets: WalletScore[]) => void;
  setFlows: (flows: FlowGraph) => void;
  setInsights: (insights: string) => void;
  setRiskScore: (score: number) => void;
  setRiskFactors: (factors: string[]) => void;
  setStatus: (status: AnalysisStatus) => void;
  reset: () => void;
}

const initialState: AnalysisState = {
  currentAnalysisId: null,
  status: 'idle',
  tokenData: null,
  wallets: [],
  flows: null,
  insights: null,
  riskScore: null,
  riskFactors: [],
};

export const useAnalysisStore = create<AnalysisState & AnalysisActions>((set) => ({
  ...initialState,

  startAnalysis: async (contractAddress: string) => {
    set({ ...initialState, status: 'running' });
    try {
      const response = await api.startAnalysis(contractAddress);
      set({ currentAnalysisId: response.analysis_id });
    } catch (error) {
      set({ status: 'error' });
      throw error;
    }
  },

  setTokenData: (token: TokenMetadata) => set({ tokenData: token }),

  addWallet: (wallet: WalletScore) =>
    set((state) => ({ wallets: [...state.wallets, wallet] })),

  setWallets: (wallets: WalletScore[]) =>
    set((state) => ({ wallets: [...state.wallets, ...wallets] })),

  setFlows: (flows: FlowGraph) => set({ flows }),

  setInsights: (insights: string) => set({ insights }),

  setRiskScore: (score: number) => set({ riskScore: score }),

  setRiskFactors: (factors: string[]) => set({ riskFactors: factors }),

  setStatus: (status: AnalysisStatus) => set({ status }),

  reset: () => set(initialState),
}));
