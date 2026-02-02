'use client'

import { useRef, useEffect, useMemo, useState, useCallback } from 'react'
import * as d3 from 'd3'
import {
  sankey,
  sankeyLinkHorizontal,
  type SankeyNode as D3SankeyNode,
  type SankeyLink as D3SankeyLink,
} from 'd3-sankey'
import type { FlowGraph, FlowNode, FlowLink } from '@/types/analysis'
import styles from './SankeyFlow.module.css'

/* --------------------------------------------------------------------------
   Types
   -------------------------------------------------------------------------- */

/** d3-sankey augments nodes with layout props */
type SankeyNodeExtra = D3SankeyNode<FlowNode, FlowLink>
type SankeyLinkExtra = D3SankeyLink<FlowNode, FlowLink>

interface SankeyFlowProps {
  flowGraph: FlowGraph | null
  isLoading?: boolean
}

/* --------------------------------------------------------------------------
   Constants
   -------------------------------------------------------------------------- */

const CLUSTER_COLORS = ['#00f0ff', '#a855f7', '#22c55e', '#ff6b35', '#ff2d7b'] as const
const NODE_TYPE_COLORS: Record<string, string> = {
  token: '#00ff88',
  wallet: '#00f0ff',
  exchange: '#a855f7',
  unknown: '#8888a8',
}

const MARGIN = { top: 24, right: 48, bottom: 24, left: 48 }
const NODE_WIDTH = 18
const NODE_PADDING = 16
const LINK_OPACITY_DEFAULT = 0.25
const LINK_OPACITY_HOVER = 0.55
const LINK_OPACITY_DIM = 0.08
const NODE_OPACITY_DIM = 0.3

/* --------------------------------------------------------------------------
   Helpers
   -------------------------------------------------------------------------- */

function truncateAddress(address: string, maxLen = 16): string {
  if (address.length <= maxLen) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function nodeColor(node: FlowNode): string {
  if (node.group !== undefined && node.group >= 0) {
    return CLUSTER_COLORS[node.group % CLUSTER_COLORS.length]
  }
  return NODE_TYPE_COLORS[node.type] ?? NODE_TYPE_COLORS.unknown
}

function computeTotalFlow(node: SankeyNodeExtra): number {
  const inbound = (node.targetLinks as SankeyLinkExtra[])?.reduce(
    (sum, l) => sum + (l.value ?? 0),
    0
  ) ?? 0
  const outbound = (node.sourceLinks as SankeyLinkExtra[])?.reduce(
    (sum, l) => sum + (l.value ?? 0),
    0
  ) ?? 0
  return Math.max(inbound, outbound)
}

function formatSol(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M SOL`
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K SOL`
  if (value >= 1) return `${value.toFixed(2)} SOL`
  return `${value.toFixed(4)} SOL`
}

/* --------------------------------------------------------------------------
   Component
   -------------------------------------------------------------------------- */

export default function SankeyFlow({ flowGraph, isLoading = false }: SankeyFlowProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 })

  /* ---- Responsive sizing via ResizeObserver ---- */
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        setDimensions({
          width: Math.max(Math.floor(width), 300),
          height: Math.max(Math.floor(height), 400),
        })
      }
    })

    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  const { width, height } = dimensions

  /* ---- Compute Sankey layout ---- */
  const layout = useMemo(() => {
    if (!flowGraph || flowGraph.nodes.length === 0 || flowGraph.links.length === 0) {
      return null
    }

    const sankeyGenerator = sankey<FlowNode, FlowLink>()
      .nodeWidth(NODE_WIDTH)
      .nodePadding(NODE_PADDING)
      .extent([
        [MARGIN.left, MARGIN.top],
        [width - MARGIN.right, height - MARGIN.bottom],
      ])
      .nodeId((d) => d.id)

    try {
      return sankeyGenerator({
        nodes: flowGraph.nodes.map((n) => ({ ...n })),
        links: flowGraph.links.map((l) => ({ ...l })),
      })
    } catch {
      return null
    }
  }, [flowGraph, width, height])

  /* ---- Tooltip helpers ---- */
  const showTooltip = useCallback((event: MouseEvent, html: string) => {
    const tooltip = tooltipRef.current
    const container = containerRef.current
    if (!tooltip || !container) return

    tooltip.innerHTML = html
    tooltip.style.opacity = '1'
    tooltip.style.pointerEvents = 'none'

    const rect = container.getBoundingClientRect()
    const x = event.clientX - rect.left + 14
    const y = event.clientY - rect.top - 14

    // Keep tooltip within container bounds
    const tooltipRect = tooltip.getBoundingClientRect()
    const clampedX = Math.min(x, width - tooltipRect.width - 8)
    const clampedY = Math.max(8, y)

    tooltip.style.left = `${clampedX}px`
    tooltip.style.top = `${clampedY}px`
  }, [width])

  const moveTooltip = useCallback((event: MouseEvent) => {
    const tooltip = tooltipRef.current
    const container = containerRef.current
    if (!tooltip || !container) return

    const rect = container.getBoundingClientRect()
    const x = event.clientX - rect.left + 14
    const y = event.clientY - rect.top - 14

    const tooltipRect = tooltip.getBoundingClientRect()
    const clampedX = Math.min(x, width - tooltipRect.width - 8)
    const clampedY = Math.max(8, y)

    tooltip.style.left = `${clampedX}px`
    tooltip.style.top = `${clampedY}px`
  }, [width])

  const hideTooltip = useCallback(() => {
    const tooltip = tooltipRef.current
    if (!tooltip) return
    tooltip.style.opacity = '0'
  }, [])

  /* ---- D3 rendering ---- */
  useEffect(() => {
    const svgEl = svgRef.current
    if (!svgEl || !layout) return

    const svg = d3.select(svgEl)
    svg.selectAll('*').remove()

    svg.attr('viewBox', `0 0 ${width} ${height}`)

    /* -- Filter definitions for neon glow -- */
    const defs = svg.append('defs')

    const glowFilter = defs
      .append('filter')
      .attr('id', 'sankey-glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%')

    glowFilter
      .append('feGaussianBlur')
      .attr('stdDeviation', '3')
      .attr('result', 'blur')

    glowFilter
      .append('feComposite')
      .attr('in', 'SourceGraphic')
      .attr('in2', 'blur')
      .attr('operator', 'over')

    /* -- Link gradients -- */
    layout.links.forEach((link, i) => {
      const srcNode = link.source as SankeyNodeExtra
      const tgtNode = link.target as SankeyNodeExtra
      const srcColor = nodeColor(srcNode as unknown as FlowNode)
      const tgtColor = nodeColor(tgtNode as unknown as FlowNode)

      const gradient = defs
        .append('linearGradient')
        .attr('id', `sankey-link-grad-${i}`)
        .attr('gradientUnits', 'userSpaceOnUse')
        .attr('x1', srcNode.x1 ?? 0)
        .attr('x2', tgtNode.x0 ?? 0)

      gradient
        .append('stop')
        .attr('offset', '0%')
        .attr('stop-color', srcColor)

      gradient
        .append('stop')
        .attr('offset', '100%')
        .attr('stop-color', tgtColor)
    })

    /* -- Render links -- */
    const linkGroup = svg.append('g').attr('class', styles.linkGroup)

    const linkPaths = linkGroup
      .selectAll('path')
      .data(layout.links)
      .join('path')
      .attr('d', sankeyLinkHorizontal())
      .attr('fill', 'none')
      .attr('stroke', (_, i) => `url(#sankey-link-grad-${i})`)
      .attr('stroke-width', (d) => Math.max(1, (d as SankeyLinkExtra).width ?? 1))
      .attr('stroke-opacity', LINK_OPACITY_DEFAULT)
      .style('cursor', 'pointer')
      .on('mouseenter', function (event: MouseEvent, d) {
        const link = d as SankeyLinkExtra
        const src = link.source as SankeyNodeExtra
        const tgt = link.target as SankeyNodeExtra

        // Dim all links, highlight this one
        linkPaths.attr('stroke-opacity', (other) => (other === d ? LINK_OPACITY_HOVER : LINK_OPACITY_DIM))
        // Dim unrelated nodes
        nodeRects.attr('opacity', (n) => (n === src || n === tgt ? 1 : NODE_OPACITY_DIM))
        nodeLabels.attr('opacity', (n) => (n === src || n === tgt ? 1 : NODE_OPACITY_DIM))

        const srcName = truncateAddress((src as unknown as FlowNode).name)
        const tgtName = truncateAddress((tgt as unknown as FlowNode).name)
        showTooltip(
          event,
          `<span class="${styles.tooltipValue}">${formatSol(link.value)}</span>` +
          `<span class="${styles.tooltipLabel}">${srcName} &rarr; ${tgtName}</span>`
        )
      })
      .on('mousemove', function (event: MouseEvent) {
        moveTooltip(event)
      })
      .on('mouseleave', function () {
        linkPaths.attr('stroke-opacity', LINK_OPACITY_DEFAULT)
        nodeRects.attr('opacity', 1)
        nodeLabels.attr('opacity', 1)
        hideTooltip()
      })

    /* -- Render nodes -- */
    const nodeGroup = svg.append('g').attr('class', styles.nodeGroup)

    const nodeGs = nodeGroup
      .selectAll('g')
      .data(layout.nodes)
      .join('g')

    const nodeRects = nodeGs
      .append('rect')
      .attr('x', (d) => (d as SankeyNodeExtra).x0 ?? 0)
      .attr('y', (d) => (d as SankeyNodeExtra).y0 ?? 0)
      .attr('width', (d) => {
        const n = d as SankeyNodeExtra
        return (n.x1 ?? 0) - (n.x0 ?? 0)
      })
      .attr('height', (d) => {
        const n = d as SankeyNodeExtra
        return Math.max(2, (n.y1 ?? 0) - (n.y0 ?? 0))
      })
      .attr('fill', (d) => nodeColor(d as unknown as FlowNode))
      .attr('rx', 3)
      .attr('ry', 3)
      .attr('filter', 'url(#sankey-glow)')
      .style('cursor', 'pointer')
      .on('mouseenter', function (event: MouseEvent, d) {
        const node = d as SankeyNodeExtra

        // Find connected links
        const connectedLinks = new Set<SankeyLinkExtra>()
        const connectedNodes = new Set<SankeyNodeExtra>()
        connectedNodes.add(node)

        ;(node.sourceLinks as SankeyLinkExtra[])?.forEach((l) => {
          connectedLinks.add(l)
          connectedNodes.add(l.target as SankeyNodeExtra)
        })
        ;(node.targetLinks as SankeyLinkExtra[])?.forEach((l) => {
          connectedLinks.add(l)
          connectedNodes.add(l.source as SankeyNodeExtra)
        })

        // Highlight connected, dim rest
        linkPaths.attr('stroke-opacity', (l) =>
          connectedLinks.has(l as SankeyLinkExtra) ? LINK_OPACITY_HOVER : LINK_OPACITY_DIM
        )
        nodeRects.attr('opacity', (n) =>
          connectedNodes.has(n as SankeyNodeExtra) ? 1 : NODE_OPACITY_DIM
        )
        nodeLabels.attr('opacity', (n) =>
          connectedNodes.has(n as SankeyNodeExtra) ? 1 : NODE_OPACITY_DIM
        )

        const flowNode = d as unknown as FlowNode
        const totalFlow = computeTotalFlow(node)
        const fullAddr = flowNode.id !== flowNode.name ? flowNode.id : ''

        showTooltip(
          event,
          `<span class="${styles.tooltipValue}">${truncateAddress(flowNode.name)}</span>` +
          (fullAddr ? `<span class="${styles.tooltipAddress}">${truncateAddress(fullAddr, 24)}</span>` : '') +
          `<span class="${styles.tooltipLabel}">Type: ${flowNode.type}</span>` +
          `<span class="${styles.tooltipLabel}">Total flow: ${formatSol(totalFlow)}</span>`
        )
      })
      .on('mousemove', function (event: MouseEvent) {
        moveTooltip(event)
      })
      .on('mouseleave', function () {
        linkPaths.attr('stroke-opacity', LINK_OPACITY_DEFAULT)
        nodeRects.attr('opacity', 1)
        nodeLabels.attr('opacity', 1)
        hideTooltip()
      })

    /* -- Node labels -- */
    const nodeLabels = nodeGs
      .append('text')
      .attr('x', (d) => {
        const n = d as SankeyNodeExtra
        return (n.x0 ?? 0) < width / 2 ? (n.x1 ?? 0) + 8 : (n.x0 ?? 0) - 8
      })
      .attr('y', (d) => {
        const n = d as SankeyNodeExtra
        return ((n.y0 ?? 0) + (n.y1 ?? 0)) / 2
      })
      .attr('dy', '0.35em')
      .attr('text-anchor', (d) => ((d as SankeyNodeExtra).x0 ?? 0) < width / 2 ? 'start' : 'end')
      .attr('class', styles.nodeLabel)
      .text((d) => truncateAddress((d as unknown as FlowNode).name))

  }, [layout, width, height, showTooltip, moveTooltip, hideTooltip])

  /* ---- Loading state ---- */
  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <div className={styles.loadingPulse} />
          <span>Tracing fund flows...</span>
        </div>
      </div>
    )
  }

  /* ---- Empty state ---- */
  if (!flowGraph || flowGraph.nodes.length === 0 || flowGraph.links.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>No flow data available</div>
      </div>
    )
  }

  /* ---- Main render ---- */
  return (
    <div className={styles.container} ref={containerRef}>
      <svg
        ref={svgRef}
        className={styles.svg}
        preserveAspectRatio="xMidYMid meet"
      />
      <div ref={tooltipRef} className={styles.tooltip} />
    </div>
  )
}
