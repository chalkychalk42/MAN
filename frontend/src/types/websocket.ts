import type { AgentType, AgentStatusValue } from './agent';
import type { TokenMetadata } from './token';
import type { WalletScore } from './wallet';
import type { FlowGraph } from './analysis';

export interface WSAgentStatus {
  agent_type: AgentType;
  status: AgentStatusValue;
  progress: number;
  current_task: string;
}

export interface WSAgentMessage {
  id: string;
  agent_type: AgentType;
  message: string;
  timestamp: number;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface WSAnalysisComplete {
  analysis_id: string;
  summary: string;
}

export interface WSAnalysisError {
  analysis_id: string;
  error: string;
  details: string;
}

export interface WSInsight {
  text: string;
  risk_level: number;
  factors: string[];
}

export type WSEvent =
  | { event: 'agent:status'; data: WSAgentStatus }
  | { event: 'agent:message'; data: WSAgentMessage }
  | { event: 'analysis:token_data'; data: TokenMetadata }
  | { event: 'analysis:wallet_found'; data: WalletScore }
  | { event: 'analysis:wallet_batch'; data: WalletScore[] }
  | { event: 'analysis:flow_data'; data: FlowGraph }
  | { event: 'analysis:insight'; data: WSInsight }
  | { event: 'analysis:complete'; data: WSAnalysisComplete }
  | { event: 'analysis:error'; data: WSAnalysisError };
