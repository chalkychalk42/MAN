'use client';

import { useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { AgentNode } from '../nodes';
import type { AgentNodeData, AgentNodeType } from '../nodes';
import { DataFlowEdge } from '../edges';
import type { DataFlowEdgeType } from '../edges';
import { useAgentStore } from '@/stores/useAgentStore';
import { AGENT_CONFIG } from '@/types/agent';
import type { AgentType } from '@/types/agent';
import styles from './AgentCanvas.module.css';

/* ------------------------------------------------------------------ */
/*  Node & edge type registries                                        */
/* ------------------------------------------------------------------ */

const nodeTypes = {
  orchestrator: AgentNode,
  scout: AgentNode,
  tracker: AgentNode,
  analyst: AgentNode,
  sleuth: AgentNode,
  sentinel: AgentNode,
};

const edgeTypes = {
  dataFlow: DataFlowEdge,
};

/* ------------------------------------------------------------------ */
/*  Initial layout -- diamond DAG                                      */
/* ------------------------------------------------------------------ */

function makeNodeData(agentType: AgentType): AgentNodeData {
  const cfg = AGENT_CONFIG[agentType];
  return {
    agentType,
    label: cfg.displayName,
    color: cfg.color,
    status: 'idle',
    progress: 0,
    currentTask: '',
  };
}

const INITIAL_NODES: AgentNodeType[] = [
  {
    id: 'orchestrator',
    type: 'orchestrator',
    position: { x: 300, y: 0 },
    data: makeNodeData('orchestrator'),
  },
  {
    id: 'scout',
    type: 'scout',
    position: { x: 300, y: 140 },
    data: makeNodeData('scout'),
  },
  {
    id: 'tracker',
    type: 'tracker',
    position: { x: 100, y: 300 },
    data: makeNodeData('tracker'),
  },
  {
    id: 'analyst',
    type: 'analyst',
    position: { x: 500, y: 300 },
    data: makeNodeData('analyst'),
  },
  {
    id: 'sleuth',
    type: 'sleuth',
    position: { x: 300, y: 460 },
    data: makeNodeData('sleuth'),
  },
  {
    id: 'sentinel',
    type: 'sentinel',
    position: { x: 300, y: 600 },
    data: makeNodeData('sentinel'),
  },
];

const INITIAL_EDGES: DataFlowEdgeType[] = [
  {
    id: 'e-orch-scout',
    source: 'orchestrator',
    target: 'scout',
    type: 'dataFlow',
    data: { color: AGENT_CONFIG.orchestrator.color, active: false },
  },
  {
    id: 'e-scout-tracker',
    source: 'scout',
    target: 'tracker',
    type: 'dataFlow',
    data: { color: AGENT_CONFIG.scout.color, active: false },
  },
  {
    id: 'e-scout-analyst',
    source: 'scout',
    target: 'analyst',
    type: 'dataFlow',
    data: { color: AGENT_CONFIG.scout.color, active: false },
  },
  {
    id: 'e-tracker-sleuth',
    source: 'tracker',
    target: 'sleuth',
    type: 'dataFlow',
    data: { color: AGENT_CONFIG.tracker.color, active: false },
  },
  {
    id: 'e-analyst-sleuth',
    source: 'analyst',
    target: 'sleuth',
    type: 'dataFlow',
    data: { color: AGENT_CONFIG.analyst.color, active: false },
  },
  {
    id: 'e-sleuth-sentinel',
    source: 'sleuth',
    target: 'sentinel',
    type: 'dataFlow',
    data: { color: AGENT_CONFIG.sleuth.color, active: false },
  },
];

/* ------------------------------------------------------------------ */
/*  Minimap helpers                                                    */
/* ------------------------------------------------------------------ */

const MINIMAP_HEX: Record<AgentType, string> = {
  orchestrator: '#ffe14d',
  scout: '#00f0ff',
  tracker: '#a855f7',
  analyst: '#00ff88',
  sleuth: '#ff6b35',
  sentinel: '#ff2d7b',
};

function minimapNodeColor(node: { data?: Record<string, unknown> }): string {
  const agentType = node.data?.agentType as AgentType | undefined;
  if (agentType && agentType in MINIMAP_HEX) {
    return MINIMAP_HEX[agentType];
  }
  return '#8888a8';
}

/* ------------------------------------------------------------------ */
/*  AgentCanvas                                                        */
/* ------------------------------------------------------------------ */

export default function AgentCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_EDGES);

  /* Subscribe to Zustand store -- agents map */
  const agents = useAgentStore((s) => s.agents);

  /* ---- Sync store changes into React Flow nodes ---- */
  useEffect(() => {
    setNodes((prevNodes) =>
      prevNodes.map((node) => {
        const agentType = node.id as AgentType;
        const agentState = agents[agentType];
        if (!agentState) return node;

        return {
          ...node,
          data: {
            ...node.data,
            status: agentState.status,
            progress: agentState.progress,
            currentTask: agentState.currentTask,
          },
        };
      }),
    );
  }, [agents, setNodes]);

  /* ---- Sync store changes into edges (active when source is working/complete) ---- */
  useEffect(() => {
    setEdges((prevEdges) =>
      prevEdges.map((edge) => {
        const sourceAgent = agents[edge.source as AgentType];
        const isActive =
          sourceAgent?.status === 'working' ||
          sourceAgent?.status === 'complete';

        return {
          ...edge,
          data: {
            ...edge.data,
            active: isActive,
          },
        };
      }),
    );
  }, [agents, setEdges]);

  return (
    <div className={styles.canvas}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.5}
        maxZoom={1.5}
        nodesDraggable
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{ animated: false }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="rgba(255,255,255,0.03)"
        />
        <Controls
          showInteractive={false}
          position="bottom-right"
        />
        <MiniMap
          nodeColor={minimapNodeColor}
          maskColor="rgba(10,10,15,0.78)"
          style={{
            background: 'rgba(18,18,26,0.6)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12,
          }}
          pannable
          zoomable
        />
      </ReactFlow>
    </div>
  );
}
