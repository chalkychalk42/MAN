'use client';

import { useMemo } from 'react';
import { useAgentStore } from '@/stores/useAgentStore';
import type { AgentType, AgentStatus, AgentMessage } from '@/types/agent';

interface UseAgentStatusReturn extends AgentStatus {
  messages: AgentMessage[];
}

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
