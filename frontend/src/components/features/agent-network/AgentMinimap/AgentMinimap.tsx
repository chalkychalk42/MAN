'use client';

import { memo } from 'react';
import { MiniMap } from '@xyflow/react';
import type { AgentType } from '@/types/agent';
import { AGENT_CONFIG } from '@/types/agent';
import styles from './AgentMinimap.module.css';

/* ------------------------------------------------------------------ */
/*  Color map (resolve CSS vars to hex for SVG minimap rendering)      */
/* ------------------------------------------------------------------ */

const MINIMAP_COLORS: Record<AgentType, string> = {
  orchestrator: '#ffe14d',
  scout: '#00f0ff',
  tracker: '#a855f7',
  analyst: '#00ff88',
  sleuth: '#ff6b35',
  sentinel: '#ff2d7b',
};

function nodeColor(node: { data?: { agentType?: string } }): string {
  const agentType = node.data?.agentType as AgentType | undefined;
  if (agentType && agentType in MINIMAP_COLORS) {
    return MINIMAP_COLORS[agentType];
  }
  return '#8888a8';
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

function AgentMinimap() {
  return (
    <div className={styles.minimapWrapper}>
      <MiniMap
        nodeColor={nodeColor}
        maskColor="rgba(10, 10, 15, 0.78)"
        style={{
          background: 'rgba(18, 18, 26, 0.6)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12,
        }}
        pannable
        zoomable
      />
    </div>
  );
}

export default memo(AgentMinimap);
