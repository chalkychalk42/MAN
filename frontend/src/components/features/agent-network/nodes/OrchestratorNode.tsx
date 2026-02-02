'use client';

import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import AgentNode from './AgentNode';
import type { AgentNodeType } from './AgentNode';

/**
 * OrchestratorNode -- cyan brain/hub icon.
 * Wraps the base AgentNode, ensuring the orchestrator color is applied.
 */
function OrchestratorNode(props: NodeProps<AgentNodeType>) {
  return <AgentNode {...props} />;
}

export default memo(OrchestratorNode);
