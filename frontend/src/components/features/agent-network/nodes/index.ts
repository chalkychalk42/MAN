export { default as AgentNode } from './AgentNode';
export type { AgentNodeData, AgentNodeType } from './AgentNode';

export { default as OrchestratorNode } from './OrchestratorNode';
export { default as ScoutNode } from './ScoutNode';
export { default as TrackerNode } from './TrackerNode';
export { default as AnalystNode } from './AnalystNode';
export { default as SleuthNode } from './SleuthNode';
export { default as SentinelNode } from './SentinelNode';

/**
 * nodeTypes registry for React Flow.
 * Maps each agent type string to its corresponding node component.
 */
import type { ComponentType } from 'react';
import type { NodeProps } from '@xyflow/react';
import type { AgentNodeType } from './AgentNode';
import OrchestratorNode from './OrchestratorNode';
import ScoutNode from './ScoutNode';
import TrackerNode from './TrackerNode';
import AnalystNode from './AnalystNode';
import SleuthNode from './SleuthNode';
import SentinelNode from './SentinelNode';

export const nodeTypes: Record<string, ComponentType<NodeProps<AgentNodeType>>> = {
  orchestrator: OrchestratorNode,
  scout: ScoutNode,
  tracker: TrackerNode,
  analyst: AnalystNode,
  sleuth: SleuthNode,
  sentinel: SentinelNode,
};
