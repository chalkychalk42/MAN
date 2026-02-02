import { create } from 'zustand';
import type { QueueStatus, BatchStatus, QueueSubmitResponse } from '@/types/queue';
import { api } from '@/lib/api';

interface QueueState {
  queueStatus: QueueStatus | null;
  activeBatchId: string | null;
  batchStatus: BatchStatus | null;
  isSubmitting: boolean;
}

interface QueueActions {
  submitBatch: (addresses: string[]) => Promise<QueueSubmitResponse>;
  fetchQueueStatus: () => Promise<void>;
  fetchBatchStatus: (id: string) => Promise<void>;
  clearQueue: () => Promise<void>;
}

const initialState: QueueState = {
  queueStatus: null,
  activeBatchId: null,
  batchStatus: null,
  isSubmitting: false,
};

export const useQueueStore = create<QueueState & QueueActions>((set) => ({
  ...initialState,

  submitBatch: async (addresses: string[]) => {
    set({ isSubmitting: true });
    try {
      const response = await api.submitBatch(addresses);
      set({
        activeBatchId: response.batch_id,
        isSubmitting: false,
      });
      return response;
    } catch (error) {
      set({ isSubmitting: false });
      throw error;
    }
  },

  fetchQueueStatus: async () => {
    try {
      const status = await api.getQueueStatus();
      set({ queueStatus: status });
    } catch {
      // Silently fail for polling – status will update on next tick
    }
  },

  fetchBatchStatus: async (id: string) => {
    try {
      const status = await api.getBatchStatus(id);
      set({ batchStatus: status });
    } catch {
      // Silently fail for polling
    }
  },

  clearQueue: async () => {
    await api.clearQueue();
    set({
      activeBatchId: null,
      batchStatus: null,
    });
  },
}));
