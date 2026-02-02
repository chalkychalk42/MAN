'use client';

import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import AgentNode from './AgentNode';
import type { AgentNodeType } from './AgentNode';

/**
 * ScoutNode -- cyan magnifying glass icon.
 * Wraps the base AgentNode, ensuring the scout color is applied.
 */
function ScoutNode(props: NodeProps<AgentNodeType>) {
  return <AgentNode {...props} />;
}

export default memo(ScoutNode);
