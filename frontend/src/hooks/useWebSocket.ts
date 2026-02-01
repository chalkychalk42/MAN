'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createSocket, onEvent, emitEvent, type Socket } from '@/lib/socket';
import { useAgentStore } from '@/stores/useAgentStore';
import { useAnalysisStore } from '@/stores/useAnalysisStore';
import type { WSAgentStatus, WSAgentMessage, WSInsight, WSAnalysisComplete, WSAnalysisError } from '@/types/websocket';
import type { TokenMetadata } from '@/types/token';
import type { WalletScore } from '@/types/wallet';
import type { FlowGraph } from '@/types/analysis';

interface UseWebSocketReturn {
  socket: Socket | null;
  connected: boolean;
  emit: (event: string, data?: unknown) => void;
}

export function useWebSocket(analysisId: string | null): UseWebSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  const { updateAgentStatus, addMessage } = useAgentStore.getState();
  const analysisStore = useAnalysisStore.getState();

  const emit = useCallback((event: string, data?: unknown) => {
    if (socketRef.current?.connected) {
      emitEvent(socketRef.current, event, data);
    }
  }, []);

  useEffect(() => {
    if (!analysisId) return;

    const socket = createSocket();
    socketRef.current = socket;

    // Connection lifecycle
    socket.on('connect', () => {
      setConnected(true);
      emitEvent(socket, 'join', { analysis_id: analysisId });
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    // Agent events
    onEvent(socket, 'agent:status', (data: WSAgentStatus) => {
      useAgentStore.getState().updateAgentStatus(data.agent_type, {
        status: data.status,
        progress: data.progress,
        currentTask: data.current_task,
      });
    });

    onEvent(socket, 'agent:message', (data: WSAgentMessage) => {
      useAgentStore.getState().addMessage({
        id: data.id,
        agentType: data.agent_type,
        message: data.message,
        timestamp: data.timestamp,
        type: data.type,
      });
    });

    // Analysis data events
    onEvent(socket, 'analysis:token_data', (data: TokenMetadata) => {
      useAnalysisStore.getState().setTokenData(data);
    });

    onEvent(socket, 'analysis:wallet_found', (data: WalletScore) => {
      useAnalysisStore.getState().addWallet(data);
    });

    onEvent(socket, 'analysis:wallet_batch', (data: WalletScore[]) => {
      useAnalysisStore.getState().setWallets(data);
    });

    onEvent(socket, 'analysis:flow_data', (data: FlowGraph) => {
      useAnalysisStore.getState().setFlows(data);
    });

    onEvent(socket, 'analysis:insight', (data: WSInsight) => {
      useAnalysisStore.getState().setInsights(data.text);
      useAnalysisStore.getState().setRiskScore(data.risk_level);
      useAnalysisStore.getState().setRiskFactors(data.factors);
    });

    onEvent(socket, 'analysis:complete', (_data: WSAnalysisComplete) => {
      useAnalysisStore.getState().setStatus('complete');
    });

    onEvent(socket, 'analysis:error', (_data: WSAnalysisError) => {
      useAnalysisStore.getState().setStatus('error');
    });

    // Connect
    socket.connect();

    // Cleanup
    return () => {
      emitEvent(socket, 'leave', { analysis_id: analysisId });
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [analysisId]);

  return { socket: socketRef.current, connected, emit };
}
