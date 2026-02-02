'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { GlassPanel, NeonText, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import type { WalletConnection } from '@/types/wallet';
import styles from './ConnectionGraph.module.css';

interface ConnectionGraphProps {
  address: string;
}

/* --------------------------------------------------------------------------
   Types for D3 force simulation
   -------------------------------------------------------------------------- */

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  connectionCount: number;
  strengthSum: number;
  isQueried: boolean;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  connectionType: string;
  strength: number;
}

/* --------------------------------------------------------------------------
   Constants
   -------------------------------------------------------------------------- */

const COLOR_MAP: Record<string, string> = {
  funding: '#00f0ff',
  withdrawal: '#a855f7',
  temporal: '#ff6b35',
  cluster: '#22c55e',
};
const COLOR_DEFAULT_EDGE = '#555570';
const COLOR_CYAN = '#00f0ff';
const NODE_COLOR_DEFAULT = '#8888a8';
const NODE_MIN_RADIUS = 5;
const NODE_MAX_RADIUS = 20;
const QUERIED_RADIUS = 24;

/* --------------------------------------------------------------------------
   Helpers
   -------------------------------------------------------------------------- */

function buildGraph(
  connections: WalletConnection[],
  queriedAddress: string
): { nodes: GraphNode[]; links: GraphLink[] } {
  const nodeMap = new Map<string, { connectionCount: number; strengthSum: number }>();

  for (const conn of connections) {
    const src = conn.source_address;
    const tgt = conn.target_address;

    if (!nodeMap.has(src)) {
      nodeMap.set(src, { connectionCount: 0, strengthSum: 0 });
    }
    if (!nodeMap.has(tgt)) {
      nodeMap.set(tgt, { connectionCount: 0, strengthSum: 0 });
    }

    const srcData = nodeMap.get(src)!;
    srcData.connectionCount += 1;
    srcData.strengthSum += conn.strength;

    const tgtData = nodeMap.get(tgt)!;
    tgtData.connectionCount += 1;
    tgtData.strengthSum += conn.strength;
  }

  // Ensure queried address is always present
  if (!nodeMap.has(queriedAddress)) {
    nodeMap.set(queriedAddress, { connectionCount: 0, strengthSum: 0 });
  }

  const nodes: GraphNode[] = Array.from(nodeMap.entries()).map(
    ([id, data]) => ({
      id,
      connectionCount: data.connectionCount,
      strengthSum: data.strengthSum,
      isQueried: id === queriedAddress,
    })
  );

  const links: GraphLink[] = connections.map((conn) => ({
    source: conn.source_address,
    target: conn.target_address,
    connectionType: conn.connection_type,
    strength: conn.strength,
  }));

  return { nodes, links };
}

function truncateAddress(addr: string): string {
  if (addr.length <= 10) return addr;
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

/* --------------------------------------------------------------------------
   Component
   -------------------------------------------------------------------------- */

export const ConnectionGraph: React.FC<ConnectionGraphProps> = ({
  address,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(
    null
  );
  const [connections, setConnections] = useState<WalletConnection[] | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch connection data
  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await api.getWalletConnections(address);
        if (!cancelled) {
          setConnections(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to load connection data'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [address]);

  // D3 force graph rendering
  const renderGraph = useCallback(() => {
    const svg = svgRef.current;
    const container = containerRef.current;
    if (!svg || !container || !connections || connections.length === 0) return;

    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    if (width === 0 || height === 0) return;

    const { nodes, links } = buildGraph(connections, address);

    // Radius scale based on strength sum
    const maxStrength = d3.max(nodes, (d) => d.strengthSum) || 1;
    const radiusScale = d3
      .scaleSqrt()
      .domain([0, maxStrength])
      .range([NODE_MIN_RADIUS, NODE_MAX_RADIUS]);

    // Clear previous content
    const svgEl = d3.select(svg);
    svgEl.selectAll('*').remove();

    // Set SVG dimensions
    svgEl.attr('width', width).attr('height', height);

    // Defs for glow filters
    const defs = svgEl.append('defs');

    // Node glow filter
    const nodeGlow = defs
      .append('filter')
      .attr('id', 'node-glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');
    nodeGlow
      .append('feGaussianBlur')
      .attr('stdDeviation', '4')
      .attr('result', 'blur');
    const nodeGlowMerge = nodeGlow.append('feMerge');
    nodeGlowMerge.append('feMergeNode').attr('in', 'blur');
    nodeGlowMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Edge glow filter
    const edgeGlow = defs
      .append('filter')
      .attr('id', 'edge-glow')
      .attr('x', '-10%')
      .attr('y', '-10%')
      .attr('width', '120%')
      .attr('height', '120%');
    edgeGlow
      .append('feGaussianBlur')
      .attr('stdDeviation', '2')
      .attr('result', 'blur');
    const edgeGlowMerge = edgeGlow.append('feMerge');
    edgeGlowMerge.append('feMergeNode').attr('in', 'blur');
    edgeGlowMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Main group for zoom/pan
    const g = svgEl.append('g');

    // Zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 4])
      .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        g.attr('transform', event.transform.toString());
      });

    svgEl.call(zoom);

    // Edge elements
    const linkGroup = g.append('g').attr('class', 'links');
    const linkElements = linkGroup
      .selectAll<SVGLineElement, GraphLink>('line')
      .data(links)
      .enter()
      .append('line')
      .attr(
        'stroke',
        (d) => COLOR_MAP[d.connectionType] || COLOR_DEFAULT_EDGE
      )
      .attr('stroke-width', (d) => Math.max(1, d.strength * 4))
      .attr('stroke-opacity', 0.5)
      .attr('filter', 'url(#edge-glow)');

    // Node elements
    const nodeGroup = g.append('g').attr('class', 'nodes');
    const nodeElements = nodeGroup
      .selectAll<SVGGElement, GraphNode>('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('cursor', 'grab');

    // Node circles
    nodeElements
      .append('circle')
      .attr('r', (d) =>
        d.isQueried ? QUERIED_RADIUS : radiusScale(d.strengthSum)
      )
      .attr('fill', (d) => (d.isQueried ? COLOR_CYAN : NODE_COLOR_DEFAULT))
      .attr('fill-opacity', (d) => (d.isQueried ? 0.2 : 0.15))
      .attr('stroke', (d) => (d.isQueried ? COLOR_CYAN : NODE_COLOR_DEFAULT))
      .attr('stroke-width', (d) => (d.isQueried ? 2 : 1.5))
      .attr('stroke-opacity', (d) => (d.isQueried ? 0.9 : 0.6))
      .attr('filter', (d) => (d.isQueried ? 'url(#node-glow)' : 'none'));

    // Inner highlight dot for queried node
    nodeElements
      .filter((d) => d.isQueried)
      .append('circle')
      .attr('r', 4)
      .attr('fill', COLOR_CYAN)
      .attr('fill-opacity', 0.8);

    // Address labels for queried node
    nodeElements
      .filter((d) => d.isQueried)
      .append('text')
      .text((d) => truncateAddress(d.id))
      .attr('dy', (d) =>
        d.isQueried ? QUERIED_RADIUS + 14 : radiusScale(d.strengthSum) + 12
      )
      .attr('text-anchor', 'middle')
      .attr('fill', COLOR_CYAN)
      .attr('font-size', '10px')
      .attr('font-family', 'var(--font-family-mono)')
      .attr('opacity', 0.8);

    // Interaction: hover highlights
    nodeElements
      .on('mouseenter', function (event: MouseEvent, d: GraphNode) {
        // Highlight connected edges
        linkElements
          .attr('stroke-opacity', (l) => {
            const src =
              typeof l.source === 'object' ? (l.source as GraphNode).id : l.source;
            const tgt =
              typeof l.target === 'object' ? (l.target as GraphNode).id : l.target;
            return src === d.id || tgt === d.id ? 0.9 : 0.1;
          })
          .attr('stroke-width', (l) => {
            const src =
              typeof l.source === 'object' ? (l.source as GraphNode).id : l.source;
            const tgt =
              typeof l.target === 'object' ? (l.target as GraphNode).id : l.target;
            return src === d.id || tgt === d.id
              ? Math.max(2, l.strength * 6)
              : Math.max(1, l.strength * 4);
          });

        // Dim non-connected nodes
        nodeElements.select('circle').attr('opacity', (n) => {
          if (n.id === d.id) return 1;
          const connected = links.some((l) => {
            const src =
              typeof l.source === 'object' ? (l.source as GraphNode).id : l.source;
            const tgt =
              typeof l.target === 'object' ? (l.target as GraphNode).id : l.target;
            return (
              (src === d.id && tgt === n.id) ||
              (tgt === d.id && src === n.id)
            );
          });
          return connected ? 1 : 0.2;
        });

        // Show tooltip
        const tooltip = tooltipRef.current;
        if (tooltip) {
          const connectedCount = links.filter((l) => {
            const src =
              typeof l.source === 'object' ? (l.source as GraphNode).id : l.source;
            const tgt =
              typeof l.target === 'object' ? (l.target as GraphNode).id : l.target;
            return src === d.id || tgt === d.id;
          }).length;

          tooltip.innerHTML = `
            <div class="${styles.tooltipAddress}">${truncateAddress(d.id)}</div>
            <div class="${styles.tooltipMeta}">
              <span>${connectedCount} connection${connectedCount !== 1 ? 's' : ''}</span>
              <span class="${styles.tooltipStrength}">strength: ${d.strengthSum.toFixed(2)}</span>
            </div>
            ${d.isQueried ? `<div class="${styles.tooltipBadge}">Queried Wallet</div>` : ''}
          `;
          tooltip.style.display = 'block';

          const containerRect = container.getBoundingClientRect();
          const tooltipRect = tooltip.getBoundingClientRect();
          let left = event.clientX - containerRect.left + 14;
          let top = event.clientY - containerRect.top - tooltipRect.height / 2;

          if (left + tooltipRect.width > containerRect.width - 10) {
            left = event.clientX - containerRect.left - tooltipRect.width - 14;
          }
          top = Math.max(
            4,
            Math.min(top, containerRect.height - tooltipRect.height - 4)
          );

          tooltip.style.left = `${left}px`;
          tooltip.style.top = `${top}px`;
        }
      })
      .on('mousemove', function (event: MouseEvent) {
        const tooltip = tooltipRef.current;
        if (tooltip && tooltip.style.display === 'block') {
          const containerRect = container.getBoundingClientRect();
          const tooltipRect = tooltip.getBoundingClientRect();
          let left = event.clientX - containerRect.left + 14;
          let top = event.clientY - containerRect.top - tooltipRect.height / 2;

          if (left + tooltipRect.width > containerRect.width - 10) {
            left =
              event.clientX - containerRect.left - tooltipRect.width - 14;
          }
          top = Math.max(
            4,
            Math.min(top, containerRect.height - tooltipRect.height - 4)
          );

          tooltip.style.left = `${left}px`;
          tooltip.style.top = `${top}px`;
        }
      })
      .on('mouseleave', function () {
        // Reset all styles
        linkElements
          .attr('stroke-opacity', 0.5)
          .attr('stroke-width', (d) => Math.max(1, d.strength * 4));
        nodeElements.select('circle').attr('opacity', 1);

        const tooltip = tooltipRef.current;
        if (tooltip) {
          tooltip.style.display = 'none';
        }
      });

    // Drag behavior
    const drag = d3
      .drag<SVGGElement, GraphNode>()
      .on('start', (event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>) => {
        if (!event.active && simulationRef.current) {
          simulationRef.current.alphaTarget(0.3).restart();
        }
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
        const target = event.sourceEvent?.target as Element | null;
        const gEl = target?.closest?.('g');
        if (gEl) d3.select(gEl).style('cursor', 'grabbing');
      })
      .on('drag', (event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>) => {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      })
      .on('end', (event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>) => {
        if (!event.active && simulationRef.current) {
          simulationRef.current.alphaTarget(0);
        }
        event.subject.fx = null;
        event.subject.fy = null;
        const target = event.sourceEvent?.target as Element | null;
        const gEl = target?.closest?.('g');
        if (gEl) d3.select(gEl).style('cursor', 'grab');
      });

    nodeElements.call(drag);

    // Force simulation
    const simulation = d3
      .forceSimulation<GraphNode>(nodes)
      .force(
        'link',
        d3
          .forceLink<GraphNode, GraphLink>(links)
          .id((d) => d.id)
          .distance(100)
          .strength((d) => d.strength * 0.5)
      )
      .force('charge', d3.forceManyBody().strength(-200).distanceMax(400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force(
        'collision',
        d3.forceCollide<GraphNode>().radius((d) =>
          d.isQueried ? QUERIED_RADIUS + 8 : radiusScale(d.strengthSum) + 4
        )
      )
      .on('tick', () => {
        linkElements
          .attr('x1', (d) => (d.source as GraphNode).x ?? 0)
          .attr('y1', (d) => (d.source as GraphNode).y ?? 0)
          .attr('x2', (d) => (d.target as GraphNode).x ?? 0)
          .attr('y2', (d) => (d.target as GraphNode).y ?? 0);

        nodeElements.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
      });

    simulationRef.current = simulation;

    // Cleanup on re-render
    return () => {
      simulation.stop();
    };
  }, [connections, address]);

  // Render + ResizeObserver
  useEffect(() => {
    const cleanup = renderGraph();

    const container = containerRef.current;
    if (!container) return cleanup;

    const observer = new ResizeObserver(() => {
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
      renderGraph();
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      if (typeof cleanup === 'function') cleanup();
    };
  }, [renderGraph]);

  // Loading state
  if (loading) {
    return (
      <GlassPanel className={styles.container}>
        <div className={styles.header}>
          <NeonText as="h3" color="purple" className={styles.heading}>
            Connected Wallets
          </NeonText>
        </div>
        <div className={styles.stateContainer}>
          <Spinner size="md" color="purple" />
          <span className={styles.stateText}>Loading connections...</span>
        </div>
      </GlassPanel>
    );
  }

  // Error state
  if (error) {
    return (
      <GlassPanel className={styles.container}>
        <div className={styles.header}>
          <NeonText as="h3" color="purple" className={styles.heading}>
            Connected Wallets
          </NeonText>
        </div>
        <div className={styles.stateContainer}>
          <span className={styles.stateIcon}>!</span>
          <span className={styles.stateText}>{error}</span>
        </div>
      </GlassPanel>
    );
  }

  // Empty state
  if (!connections || connections.length === 0) {
    return (
      <GlassPanel className={styles.container}>
        <div className={styles.header}>
          <NeonText as="h3" color="purple" className={styles.heading}>
            Connected Wallets
          </NeonText>
        </div>
        <div className={styles.stateContainer}>
          <svg
            className={styles.emptyIcon}
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="5" r="2.5" />
            <circle cx="5" cy="19" r="2.5" />
            <circle cx="19" cy="19" r="2.5" />
            <line x1="12" y1="7.5" x2="5" y2="16.5" />
            <line x1="12" y1="7.5" x2="19" y2="16.5" />
            <line x1="7.5" y1="19" x2="16.5" y2="19" />
          </svg>
          <span className={styles.stateText}>No connections found</span>
          <span className={styles.stateSubtext}>
            Wallet connections will appear after analysis
          </span>
        </div>
      </GlassPanel>
    );
  }

  return (
    <GlassPanel className={styles.container}>
      <div className={styles.header}>
        <NeonText as="h3" color="purple" className={styles.heading}>
          Connected Wallets
        </NeonText>
        <div className={styles.legend}>
          <span className={styles.legendItem}>
            <span
              className={styles.legendDot}
              style={{ background: COLOR_MAP.funding }}
            />
            Funding
          </span>
          <span className={styles.legendItem}>
            <span
              className={styles.legendDot}
              style={{ background: COLOR_MAP.withdrawal }}
            />
            Withdrawal
          </span>
          <span className={styles.legendItem}>
            <span
              className={styles.legendDot}
              style={{ background: COLOR_MAP.temporal }}
            />
            Temporal
          </span>
          <span className={styles.legendItem}>
            <span
              className={styles.legendDot}
              style={{ background: COLOR_MAP.cluster }}
            />
            Cluster
          </span>
        </div>
      </div>
      <div className={styles.graphArea} ref={containerRef}>
        <svg ref={svgRef} className={styles.graph} />
        <div ref={tooltipRef} className={styles.tooltip} />
      </div>
    </GlassPanel>
  );
};

ConnectionGraph.displayName = 'ConnectionGraph';
