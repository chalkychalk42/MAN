'use client';

import { useMemo } from 'react';
import { useAgentStore } from '@/stores/useAgentStore';
import type { AgentType, AgentStatus, AgentMessage } from '@/types/agent';

interface UseAgentStatusReturn extends AgentStatus {
  messages: AgentMessage[];
}

/**
 * Returns the status and filtered messages for a single agent.
 */
export function useAgentStatus(agentType: AgentType): UseAgentStatusReturn {
  const agentStatus = useAgentStore((state) => state.agents[agentType]);
  const allMessages = useAgentStore((state) => state.messages);

  const messages = useMemo(
    () => allMessages.filter((msg) => msg.agentType === agentType),
    [allMessages, agentType]
  );

  return {
    ...agentStatus,
    messages,
  };
}

/**
 * Returns the status record for an agent by its type.
 */
export function getAgentByType(agentType: AgentType): AgentStatus {
  return useAgentStore.getState().agents[agentType];
}

/**
 * Returns true if any agent is currently in the 'initializing' or 'working' state.
 */
export function isAnalysisRunning(): boolean {
  const agents = useAgentStore.getState().agents;
  return Object.values(agents).some(
    (a) => a.status === 'initializing' || a.status === 'working'
  );
}

/**
 * Returns true when every agent has reached the 'complete' state.
 */
export function allComplete(): boolean {
  const agents = useAgentStore.getState().agents;
  return Object.values(agents).every((a) => a.status === 'complete');
}

/**
 * React hook variants of the convenience helpers so components can
 * subscribe to store updates reactively.
 */
export function useIsAnalysisRunning(): boolean {
  return useAgentStore((state) =>
    Object.values(state.agents).some(
      (a) => a.status === 'initializing' || a.status === 'working'
    )
  );
}

export function useAllComplete(): boolean {
  return useAgentStore((state) =>
    Object.values(state.agents).every((a) => a.status === 'complete')
  );
}
