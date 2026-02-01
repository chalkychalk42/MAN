export type AgentType = 'scout' | 'tracker' | 'analyst' | 'sleuth' | 'sentinel' | 'orchestrator';

export type AgentStatusValue = 'idle' | 'initializing' | 'working' | 'complete' | 'error';

export interface AgentStatus {
  status: AgentStatusValue;
  progress: number;
  currentTask: string;
}

export interface AgentMessage {
  id: string;
  agentType: AgentType;
  message: string;
  timestamp: number;
  type: 'info' | 'success' | 'warning' | 'error';
}

export const AGENT_CONFIG: Record<AgentType, { displayName: string; color: string; description: string }> = {
  orchestrator: {
    displayName: 'Hive Mind',
    color: 'var(--color-agent-orchestrator)',
    description: 'Coordinates all agents',
  },
  scout: {
    displayName: 'Scout',
    color: 'var(--color-agent-scout)',
    description: 'Fetches on-chain data',
  },
  tracker: {
    displayName: 'Tracker',
    color: 'var(--color-agent-tracker)',
    description: 'Traces money flows',
  },
  analyst: {
    displayName: 'Analyst',
    color: 'var(--color-agent-analyst)',
    description: 'Calculates PNL & scores',
  },
  sleuth: {
    displayName: 'Sleuth',
    color: 'var(--color-agent-sleuth)',
    description: 'Finds wallet connections',
  },
  sentinel: {
    displayName: 'Sentinel',
    color: 'var(--color-agent-sentinel)',
    description: 'Assesses risk levels',
  },
};
