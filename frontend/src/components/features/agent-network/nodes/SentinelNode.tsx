'use client';

import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import AgentNode from './AgentNode';
import type { AgentNodeType } from './AgentNode';

/**
 * SentinelNode -- pink shield icon.
 * Wraps the base AgentNode, ensuring the sentinel color is applied.
 */
function SentinelNode(props: NodeProps<AgentNodeType>) {
  return <AgentNode {...props} />;
}

export default memo(SentinelNode);
