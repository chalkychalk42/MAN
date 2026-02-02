'use client';

import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import AgentNode from './AgentNode';
import type { AgentNodeType } from './AgentNode';

/**
 * TrackerNode -- purple flow/route icon.
 * Wraps the base AgentNode, ensuring the tracker color is applied.
 */
function TrackerNode(props: NodeProps<AgentNodeType>) {
  return <AgentNode {...props} />;
}

export default memo(TrackerNode);
