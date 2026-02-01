'use client'

import { useRef, useEffect, useMemo, useState } from 'react'
import * as d3 from 'd3'
import { sankey, sankeyLinkHorizontal, SankeyNode, SankeyLink } from 'd3-sankey'
import styles from './SankeyFlow.module.css'

interface FlowNode {
  id: string
  name: string
  type: 'token' | 'wallet' | 'exchange' | 'unknown'
}

interface FlowLink {
  source: string
  target: string
  value: number
}

interface FlowGraph {
  nodes: FlowNode[]
  links: FlowLink[]
}

interface SankeyFlowProps {
  data: FlowGraph | null
  width?: number
  height?: number
}

const nodeColors: Record<string, string> = {
  token: '#00ff88',
  wallet: '#00f0ff',
  exchange: '#a855f7',
  unknown: '#8888a8',
}

function truncateLabel(name: string, maxLength = 16): string {
  if (name.length <= maxLength) return name
  return `${name.slice(0, 6)}...${name.slice(-4)}`
}

export default function SankeyFlow({ data, width: propWidth, height: propHeight }: SankeyFlowProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: propWidth ?? 800, height: propHeight ?? 500 })

  // Observe container resizing for responsive layout
  useEffect(() => {
    if (propWidth && propHeight) return
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect
        setDimensions({
          width: propWidth ?? Math.max(w, 300),
          height: propHeight ?? Math.max(h, 400),
        })
      }
    })

    observer.observe(container)
    return () => observer.disconnect()
  }, [propWidth, propHeight])

  const { width, height } = dimensions

  // Compute the sankey layout from data
  const layout = useMemo(() => {
    if (!data || data.nodes.length === 0) return null

    const sankeyGenerator = sankey<FlowNode, FlowLink>()
      .nodeWidth(20)
      .nodePadding(14)
      .extent([[40, 20], [width - 40, height - 20]])
      .nodeId((d: any) => d.id)

    const graph = sankeyGenerator({
      nodes: data.nodes.map((d) => ({ ...d })),
      links: data.links.map((d) => ({ ...d })),
    })

    return graph
  }, [data, width, height])

  // Render with D3
  useEffect(() => {
    if (!svgRef.current || !layout) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    svg.attr('viewBox', `0 0 ${width} ${height}`)

    // Defs for link gradients
    const defs = svg.append('defs')

    layout.links.forEach((link: any, i: number) => {
      const gradient = defs
        .append('linearGradient')
        .attr('id', `link-gradient-${i}`)
        .attr('gradientUnits', 'userSpaceOnUse')
        .attr('x1', link.source.x1)
        .attr('x2', link.target.x0)

      gradient
        .append('stop')
        .attr('offset', '0%')
        .attr('stop-color', nodeColors[link.source.type] ?? nodeColors.unknown)

      gradient
        .append('stop')
        .attr('offset', '100%')
        .attr('stop-color', nodeColors[link.target.type] ?? nodeColors.unknown)
    })

    // Render links
    const linkGroup = svg
      .append('g')
      .attr('class', styles.link)

    linkGroup
      .selectAll('path')
      .data(layout.links)
      .join('path')
      .attr('d', sankeyLinkHorizontal())
      .attr('stroke', (_d: any, i: number) => `url(#link-gradient-${i})`)
      .attr('stroke-width', (d: any) => Math.max(1, d.width))
      .attr('stroke-opacity', 0.3)
      .on('mouseenter', function (event: MouseEvent, d: any) {
        d3.select(this).attr('stroke-opacity', 0.6)
        showTooltip(event, `${d.source.name} → ${d.target.name}: ${d.value.toFixed(4)} SOL`)
      })
      .on('mousemove', function (event: MouseEvent) {
        moveTooltip(event)
      })
      .on('mouseleave', function () {
        d3.select(this).attr('stroke-opacity', 0.3)
        hideTooltip()
      })

    // Render nodes
    const nodeGroup = svg
      .append('g')
      .attr('class', styles.node)

    const nodes = nodeGroup
      .selectAll('g')
      .data(layout.nodes)
      .join('g')

    nodes
      .append('rect')
      .attr('x', (d: any) => d.x0)
      .attr('y', (d: any) => d.y0)
      .attr('width', (d: any) => d.x1 - d.x0)
      .attr('height', (d: any) => Math.max(1, d.y1 - d.y0))
      .attr('fill', (d: any) => nodeColors[d.type] ?? nodeColors.unknown)
      .attr('rx', 3)
      .on('mouseenter', function (event: MouseEvent, d: any) {
        const label = d.name !== d.id ? `${d.name} (${d.id})` : d.name
        showTooltip(event, `${label}\nType: ${d.type}`)
      })
      .on('mousemove', function (event: MouseEvent) {
        moveTooltip(event)
      })
      .on('mouseleave', function () {
        hideTooltip()
      })

    // Render labels
    nodes
      .append('text')
      .attr('x', (d: any) => (d.x0 < width / 2 ? d.x1 + 8 : d.x0 - 8))
      .attr('y', (d: any) => (d.y0 + d.y1) / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', (d: any) => (d.x0 < width / 2 ? 'start' : 'end'))
      .text((d: any) => truncateLabel(d.name))

    // Tooltip helpers
    function showTooltip(event: MouseEvent, text: string) {
      const tooltip = tooltipRef.current
      if (!tooltip) return
      tooltip.style.display = 'block'
      tooltip.textContent = text
      moveTooltip(event)
    }

    function moveTooltip(event: MouseEvent) {
      const tooltip = tooltipRef.current
      if (!tooltip) return
      const container = containerRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      tooltip.style.left = `${event.clientX - rect.left + 12}px`
      tooltip.style.top = `${event.clientY - rect.top - 10}px`
    }

    function hideTooltip() {
      const tooltip = tooltipRef.current
      if (!tooltip) return
      tooltip.style.display = 'none'
    }
  }, [layout, width, height])

  if (!data) {
    return (
      <div className={styles.container}>
        <div className={styles.placeholder}>Waiting for flow data...</div>
      </div>
    )
  }

  return (
    <div className={styles.container} ref={containerRef} style={{ position: 'relative' }}>
      <svg
        ref={svgRef}
        className={styles.svg}
        width={width}
        height={height}
      />
      <div ref={tooltipRef} className={styles.tooltip} style={{ display: 'none' }} />
    </div>
  )
}
