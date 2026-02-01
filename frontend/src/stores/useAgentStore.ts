import { create } from 'zustand';
import type { AgentType, AgentStatus, AgentMessage } from '@/types/agent';

interface AgentState {
  agents: Record<AgentType, AgentStatus>;
  messages: AgentMessage[];
}

interface AgentActions {
  updateAgentStatus: (
    agentType: AgentType,
    status: Partial<AgentStatus>
  ) => void;
  addMessage: (message: AgentMessage) => void;
  resetAgents: () => void;
}

const createInitialAgentStatus = (): AgentStatus => ({
  status: 'idle',
  progress: 0,
  currentTask: '',
});

const createInitialAgents = (): Record<AgentType, AgentStatus> => ({
  orchestrator: createInitialAgentStatus(),
  scout: createInitialAgentStatus(),
  tracker: createInitialAgentStatus(),
  analyst: createInitialAgentStatus(),
  sleuth: createInitialAgentStatus(),
  sentinel: createInitialAgentStatus(),
});

const initialState: AgentState = {
  agents: createInitialAgents(),
  messages: [],
};

export const useAgentStore = create<AgentState & AgentActions>((set) => ({
  ...initialState,

  updateAgentStatus: (agentType: AgentType, status: Partial<AgentStatus>) =>
    set((state) => ({
      agents: {
        ...state.agents,
        [agentType]: {
          ...state.agents[agentType],
          ...status,
        },
      },
    })),

  addMessage: (message: AgentMessage) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  resetAgents: () => set(initialState),
}));
