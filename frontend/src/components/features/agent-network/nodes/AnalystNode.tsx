'use client';

import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import AgentNode from './AgentNode';
import type { AgentNodeType } from './AgentNode';

/**
 * AnalystNode -- green chart/bar icon.
 * Wraps the base AgentNode, ensuring the analyst color is applied.
 */
function AnalystNode(props: NodeProps<AgentNodeType>) {
  return <AgentNode {...props} />;
}

export default memo(AnalystNode);
