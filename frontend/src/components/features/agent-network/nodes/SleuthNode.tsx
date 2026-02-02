'use client';

import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import AgentNode from './AgentNode';
import type { AgentNodeType } from './AgentNode';

/**
 * SleuthNode -- orange link/connection icon.
 * Wraps the base AgentNode, ensuring the sleuth color is applied.
 */
function SleuthNode(props: NodeProps<AgentNodeType>) {
  return <AgentNode {...props} />;
}

export default memo(SleuthNode);
