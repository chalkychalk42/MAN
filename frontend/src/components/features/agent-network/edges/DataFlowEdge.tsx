'use client';

import { memo } from 'react';
import { getBezierPath } from '@xyflow/react';
import type { EdgeProps, Edge } from '@xyflow/react';
import styles from './DataFlowEdge.module.css';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface DataFlowEdgeData {
  color?: string;
  active?: boolean;
  [key: string]: unknown;
}

export type DataFlowEdgeType = Edge<DataFlowEdgeData>;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

function DataFlowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps<DataFlowEdgeType>) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const isActive = data?.active ?? false;
  const edgeColor = data?.color ?? 'var(--color-agent-scout)';

  /* Unique filter IDs per edge to avoid SVG id collisions */
  const glowId = `glow-${id}`;
  const particleGlowId = `pglow-${id}`;

  return (
    <g>
      {/* ---- SVG filter definitions ---- */}
      <defs>
        <filter id={glowId} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter
          id={particleGlowId}
          x="-100%"
          y="-100%"
          width="300%"
          height="300%"
        >
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ---- Base path (always visible) ---- */}
      <path d={edgePath} className={styles.basePath} />

      {/* ---- Active overlay + particles ---- */}
      {isActive && (
        <>
          {/* Animated dashed stroke */}
          <path
            d={edgePath}
            className={styles.activePath}
            style={{
              stroke: edgeColor,
              filter: `url(#${glowId})`,
            }}
          />

          {/* Travelling particles */}
          {[0, 0.7, 1.4].map((delay, i) => (
            <circle
              key={i}
              r={3}
              fill={i === 0 ? edgeColor : 'rgba(255,255,255,0.9)'}
              className={styles.particle}
              style={{ filter: `url(#${particleGlowId})` }}
            >
              <animateMotion
                dur="2s"
                begin={`${delay}s`}
                repeatCount="indefinite"
                path={edgePath}
              />
            </circle>
          ))}
        </>
      )}
    </g>
  );
}

export default memo(DataFlowEdge);
