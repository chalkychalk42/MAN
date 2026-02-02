'use client';

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps, Node } from '@xyflow/react';
import type { AgentType, AgentStatusValue } from '@/types/agent';
import styles from './AgentNode.module.css';

/* ------------------------------------------------------------------ */
/*  Node data contract                                                 */
/* ------------------------------------------------------------------ */

export interface AgentNodeData {
  agentType: AgentType;
  label: string;
  color: string;
  status: AgentStatusValue;
  progress: number;
  currentTask: string;
  [key: string]: unknown;
}

export type AgentNodeType = Node<AgentNodeData>;

/* ------------------------------------------------------------------ */
/*  Per-agent SVG icons                                                */
/* ------------------------------------------------------------------ */

function AgentIcon({ agentType }: { agentType: AgentType }) {
  switch (agentType) {
    case 'orchestrator':
      return (
        <svg viewBox="0 0 24 24">
          {/* hub / brain: three connected dots */}
          <circle cx="12" cy="6" r="2" />
          <circle cx="6" cy="18" r="2" />
          <circle cx="18" cy="18" r="2" />
          <line x1="12" y1="8" x2="6" y2="16" />
          <line x1="12" y1="8" x2="18" y2="16" />
          <line x1="6" y1="18" x2="18" y2="18" />
        </svg>
      );
    case 'scout':
      return (
        <svg viewBox="0 0 24 24">
          {/* magnifying glass */}
          <circle cx="11" cy="11" r="6" />
          <line x1="16" y1="16" x2="21" y2="21" />
        </svg>
      );
    case 'tracker':
      return (
        <svg viewBox="0 0 24 24">
          {/* flow / route arrows */}
          <polyline points="4 7 4 4 7 4" />
          <line x1="4" y1="4" x2="13" y2="13" />
          <polyline points="17 11 17 20 11 20" />
          <line x1="20" y1="20" x2="13" y2="13" />
        </svg>
      );
    case 'analyst':
      return (
        <svg viewBox="0 0 24 24">
          {/* bar chart */}
          <rect x="4" y="14" width="4" height="6" rx="1" />
          <rect x="10" y="8" width="4" height="12" rx="1" />
          <rect x="16" y="4" width="4" height="16" rx="1" />
        </svg>
      );
    case 'sleuth':
      return (
        <svg viewBox="0 0 24 24">
          {/* chain / link */}
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      );
    case 'sentinel':
      return (
        <svg viewBox="0 0 24 24">
          {/* shield */}
          <path d="M12 2l7 4v5c0 5-3.5 9.74-7 11-3.5-1.26-7-6-7-11V6l7-4z" />
        </svg>
      );
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Status display text                                                */
/* ------------------------------------------------------------------ */

function statusText(status: AgentStatusValue, currentTask: string): string {
  switch (status) {
    case 'idle':
      return 'Ready';
    case 'initializing':
      return 'Initializing\u2026';
    case 'working':
      return currentTask || 'Processing\u2026';
    case 'complete':
      return 'Complete';
    case 'error':
      return currentTask || 'Error';
    default:
      return '';
  }
}

/* ------------------------------------------------------------------ */
/*  AgentNode                                                          */
/* ------------------------------------------------------------------ */

function AgentNode({ data }: NodeProps<AgentNodeType>) {
  const { agentType, label, color, status, progress, currentTask } = data;

  const stateClass = styles[status] ?? '';
  const isWorking = status === 'working';
  const isComplete = status === 'complete';
  const showProgress = status === 'working' || status === 'initializing';

  /* Orchestrator = source-only. Sentinel = target-only. Others = both. */
  const showTarget = agentType !== 'orchestrator';
  const showSource = agentType !== 'sentinel';

  return (
    <div
      className={`${styles.node} ${stateClass}`}
      style={{ '--agent-color': color } as React.CSSProperties}
    >
      {/* Target handle (top) */}
      {showTarget && <Handle type="target" position={Position.Top} />}

      {/* Scan-line overlay while working */}
      {isWorking && <div className={styles.scanLine} />}

      {/* Status indicator dot */}
      <div className={styles.statusDot} />

      {/* Complete checkmark badge */}
      {isComplete && (
        <div className={styles.completeCheck}>
          <svg viewBox="0 0 24 24">
            <polyline points="4 12 10 18 20 6" />
          </svg>
        </div>
      )}

      {/* Icon */}
      <div className={styles.icon}>
        <AgentIcon agentType={agentType} />
      </div>

      {/* Name */}
      <div className={styles.name}>{label}</div>

      {/* Status text */}
      <div className={styles.taskText}>
        {statusText(status, currentTask)}
      </div>

      {/* Progress bar */}
      {showProgress && (
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      )}

      {/* Source handle (bottom) */}
      {showSource && <Handle type="source" position={Position.Bottom} />}
    </div>
  );
}

export default memo(AgentNode);
