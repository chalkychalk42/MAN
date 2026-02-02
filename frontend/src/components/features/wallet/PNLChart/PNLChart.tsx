'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { GlassPanel, NeonText, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import type { PNLDataPoint } from '@/types/wallet';
import styles from './PNLChart.module.css';

interface PNLChartProps {
  address: string;
}

interface Margin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

const MARGIN: Margin = { top: 20, right: 20, bottom: 36, left: 60 };
const COLOR_GREEN = '#22c55e';
const COLOR_PINK = '#ff2d7b';
const GRID_COLOR = 'rgba(255, 255, 255, 0.04)';
const AXIS_COLOR = 'rgba(136, 136, 168, 0.5)';

export const PNLChart: React.FC<PNLChartProps> = ({ address }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<PNLDataPoint[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch PNL data
  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await api.getWalletPnlHistory(address);
        if (!cancelled) {
          setData(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to load PNL data'
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

  // D3 rendering
  const renderChart = useCallback(() => {
    const svg = svgRef.current;
    const container = containerRef.current;
    if (!svg || !container || !data || data.length === 0) return;

    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    if (width === 0 || height === 0) return;

    const innerWidth = width - MARGIN.left - MARGIN.right;
    const innerHeight = height - MARGIN.top - MARGIN.bottom;

    if (innerWidth <= 0 || innerHeight <= 0) return;

    // Parse data
    const parsed = data.map((d) => ({
      date: new Date(d.date),
      value: d.cumulative_pnl_sol,
    }));

    // Clear previous
    const svgEl = d3.select(svg);
    svgEl.selectAll('*').remove();

    // Set SVG dimensions
    svgEl.attr('width', width).attr('height', height);

    // Defs for gradients and filters
    const defs = svgEl.append('defs');

    // Green area gradient (positive)
    const greenGrad = defs
      .append('linearGradient')
      .attr('id', 'pnl-area-green')
      .attr('x1', '0')
      .attr('y1', '0')
      .attr('x2', '0')
      .attr('y2', '1');
    greenGrad
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', COLOR_GREEN)
      .attr('stop-opacity', 0.25);
    greenGrad
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', COLOR_GREEN)
      .attr('stop-opacity', 0.02);

    // Pink area gradient (negative)
    const pinkGrad = defs
      .append('linearGradient')
      .attr('id', 'pnl-area-pink')
      .attr('x1', '0')
      .attr('y1', '1')
      .attr('x2', '0')
      .attr('y2', '0');
    pinkGrad
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', COLOR_PINK)
      .attr('stop-opacity', 0.25);
    pinkGrad
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', COLOR_PINK)
      .attr('stop-opacity', 0.02);

    // Glow filter for the line
    const glowFilter = defs
      .append('filter')
      .attr('id', 'pnl-line-glow')
      .attr('x', '-20%')
      .attr('y', '-20%')
      .attr('width', '140%')
      .attr('height', '140%');
    glowFilter
      .append('feGaussianBlur')
      .attr('stdDeviation', '3')
      .attr('result', 'blur');
    const merge = glowFilter.append('feMerge');
    merge.append('feMergeNode').attr('in', 'blur');
    merge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Scales
    const xExtent = d3.extent(parsed, (d) => d.date) as [Date, Date];
    const xScale = d3.scaleTime().domain(xExtent).range([0, innerWidth]);

    const yExtent = d3.extent(parsed, (d) => d.value) as [number, number];
    const yPadding = (yExtent[1] - yExtent[0]) * 0.1 || 1;
    const yScale = d3
      .scaleLinear()
      .domain([yExtent[0] - yPadding, yExtent[1] + yPadding])
      .range([innerHeight, 0])
      .nice();

    // Chart group
    const g = svgEl
      .append('g')
      .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

    // Grid lines (horizontal)
    const yTicks = yScale.ticks(5);
    g.selectAll('.grid-line')
      .data(yTicks)
      .enter()
      .append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', (d) => yScale(d))
      .attr('y2', (d) => yScale(d))
      .attr('stroke', GRID_COLOR)
      .attr('stroke-width', 1);

    // Zero line (if range includes zero)
    if (yExtent[0] < 0 && yExtent[1] > 0) {
      g.append('line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', yScale(0))
        .attr('y2', yScale(0))
        .attr('stroke', 'rgba(255, 255, 255, 0.1)')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '4,4');
    }

    // Line generator
    const line = d3
      .line<{ date: Date; value: number }>()
      .x((d) => xScale(d.date))
      .y((d) => yScale(d.value))
      .curve(d3.curveMonotoneX);

    // Area generators: positive area above zero, negative area below zero
    const zeroY = yScale(0);
    const clampedZeroY = Math.max(0, Math.min(innerHeight, zeroY));

    // Positive area (from line down to zero)
    const areaPositive = d3
      .area<{ date: Date; value: number }>()
      .x((d) => xScale(d.date))
      .y0(clampedZeroY)
      .y1((d) => Math.min(yScale(d.value), clampedZeroY))
      .curve(d3.curveMonotoneX);

    // Negative area (from zero down to line)
    const areaNegative = d3
      .area<{ date: Date; value: number }>()
      .x((d) => xScale(d.date))
      .y0(clampedZeroY)
      .y1((d) => Math.max(yScale(d.value), clampedZeroY))
      .curve(d3.curveMonotoneX);

    // Clip paths for positive/negative regions
    defs
      .append('clipPath')
      .attr('id', 'clip-positive')
      .append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', innerWidth)
      .attr('height', clampedZeroY);

    defs
      .append('clipPath')
      .attr('id', 'clip-negative')
      .append('rect')
      .attr('x', 0)
      .attr('y', clampedZeroY)
      .attr('width', innerWidth)
      .attr('height', innerHeight - clampedZeroY);

    // Draw positive area
    g.append('path')
      .datum(parsed)
      .attr('d', areaPositive)
      .attr('fill', 'url(#pnl-area-green)')
      .attr('clip-path', 'url(#clip-positive)');

    // Draw negative area
    g.append('path')
      .datum(parsed)
      .attr('d', areaNegative)
      .attr('fill', 'url(#pnl-area-pink)')
      .attr('clip-path', 'url(#clip-negative)');

    // Determine final PNL for line color
    const lastValue = parsed[parsed.length - 1].value;
    const lineColor = lastValue >= 0 ? COLOR_GREEN : COLOR_PINK;

    // Draw the line
    const path = g
      .append('path')
      .datum(parsed)
      .attr('d', line)
      .attr('fill', 'none')
      .attr('stroke', lineColor)
      .attr('stroke-width', 2.5)
      .attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round')
      .attr('filter', 'url(#pnl-line-glow)');

    // Animate line draw
    const totalLength = (path.node() as SVGPathElement)?.getTotalLength() || 0;
    if (totalLength > 0) {
      path
        .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
        .attr('stroke-dashoffset', totalLength)
        .transition()
        .duration(1500)
        .ease(d3.easeQuadOut)
        .attr('stroke-dashoffset', 0);
    }

    // X-axis
    const xAxis = d3
      .axisBottom(xScale)
      .ticks(Math.min(parsed.length, 6))
      .tickFormat((d) => d3.timeFormat('%b %d')(d as Date))
      .tickSize(0)
      .tickPadding(10);

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .call((sel) => sel.select('.domain').remove())
      .selectAll('text')
      .attr('fill', AXIS_COLOR)
      .style('font-size', '10px')
      .style('font-family', 'var(--font-family-mono)');

    // Y-axis
    const yAxis = d3
      .axisLeft(yScale)
      .ticks(5)
      .tickFormat((d) => `${d3.format('+.1f')(d as number)} SOL`)
      .tickSize(0)
      .tickPadding(8);

    g.append('g')
      .call(yAxis)
      .call((sel) => sel.select('.domain').remove())
      .selectAll('text')
      .attr('fill', AXIS_COLOR)
      .style('font-size', '10px')
      .style('font-family', 'var(--font-family-mono)');

    // Interactive overlay for crosshair/tooltip
    const crosshairGroup = g.append('g').style('display', 'none');

    // Vertical crosshair line
    crosshairGroup
      .append('line')
      .attr('class', 'crosshair-line')
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', 'rgba(255, 255, 255, 0.15)')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,3');

    // Horizontal crosshair line
    crosshairGroup
      .append('line')
      .attr('class', 'crosshair-h-line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('stroke', 'rgba(255, 255, 255, 0.08)')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,3');

    // Data point circle
    crosshairGroup
      .append('circle')
      .attr('r', 5)
      .attr('fill', lineColor)
      .attr('stroke', '#0a0a0f')
      .attr('stroke-width', 2);

    // Outer glow circle
    crosshairGroup
      .append('circle')
      .attr('r', 10)
      .attr('fill', 'none')
      .attr('stroke', lineColor)
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.3);

    // Bisector for finding nearest data point
    const bisect = d3.bisector<{ date: Date; value: number }, Date>(
      (d) => d.date
    ).left;

    // Invisible overlay rect for mouse events
    g.append('rect')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'none')
      .attr('pointer-events', 'all')
      .on('mousemove', function (event: MouseEvent) {
        const [mx] = d3.pointer(event, this);
        const x0 = xScale.invert(mx);
        const idx = bisect(parsed, x0, 1);
        const d0 = parsed[idx - 1];
        const d1 = parsed[idx];
        if (!d0) return;
        const d =
          d1 && x0.getTime() - d0.date.getTime() > d1.date.getTime() - x0.getTime()
            ? d1
            : d0;

        const cx = xScale(d.date);
        const cy = yScale(d.value);

        crosshairGroup.style('display', null);
        crosshairGroup.select('.crosshair-line').attr('x1', cx).attr('x2', cx);
        crosshairGroup
          .select('.crosshair-h-line')
          .attr('y1', cy)
          .attr('y2', cy);
        crosshairGroup.selectAll('circle').attr('cx', cx).attr('cy', cy);

        // Tooltip
        const tooltip = tooltipRef.current;
        if (tooltip) {
          const dateStr = d3.timeFormat('%b %d, %Y')(d.date);
          const pnlStr = d3.format('+.4f')(d.value);
          const isPositive = d.value >= 0;

          tooltip.innerHTML = `
            <div class="${styles.tooltipDate}">${dateStr}</div>
            <div class="${styles.tooltipValue}" style="color: ${isPositive ? COLOR_GREEN : COLOR_PINK}">
              ${pnlStr} SOL
            </div>
          `;
          tooltip.style.display = 'block';

          // Position tooltip
          const svgRect = svg.getBoundingClientRect();
          const tooltipRect = tooltip.getBoundingClientRect();
          let left = cx + MARGIN.left + 14;
          let top = cy + MARGIN.top - tooltipRect.height / 2;

          // Flip to left if near right edge
          if (left + tooltipRect.width > svgRect.width - 10) {
            left = cx + MARGIN.left - tooltipRect.width - 14;
          }
          // Clamp vertical
          top = Math.max(4, Math.min(top, svgRect.height - tooltipRect.height - 4));

          tooltip.style.left = `${left}px`;
          tooltip.style.top = `${top}px`;
        }
      })
      .on('mouseleave', () => {
        crosshairGroup.style('display', 'none');
        const tooltip = tooltipRef.current;
        if (tooltip) {
          tooltip.style.display = 'none';
        }
      });
  }, [data]);

  // Render + ResizeObserver
  useEffect(() => {
    renderChart();

    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      renderChart();
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [renderChart]);

  // Loading state
  if (loading) {
    return (
      <GlassPanel className={styles.container}>
        <div className={styles.header}>
          <NeonText as="h3" color="green" className={styles.heading}>
            PNL Over Time
          </NeonText>
        </div>
        <div className={styles.stateContainer}>
          <Spinner size="md" color="green" />
          <span className={styles.stateText}>Loading PNL data...</span>
        </div>
      </GlassPanel>
    );
  }

  // Error state
  if (error) {
    return (
      <GlassPanel className={styles.container}>
        <div className={styles.header}>
          <NeonText as="h3" color="green" className={styles.heading}>
            PNL Over Time
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
  if (!data || data.length === 0) {
    return (
      <GlassPanel className={styles.container}>
        <div className={styles.header}>
          <NeonText as="h3" color="green" className={styles.heading}>
            PNL Over Time
          </NeonText>
        </div>
        <div className={styles.stateContainer}>
          <svg
            className={styles.emptyIcon}
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <span className={styles.stateText}>No PNL data available</span>
          <span className={styles.stateSubtext}>
            PNL history will appear once transactions are analyzed
          </span>
        </div>
      </GlassPanel>
    );
  }

  return (
    <GlassPanel className={styles.container}>
      <div className={styles.header}>
        <NeonText as="h3" color="green" className={styles.heading}>
          PNL Over Time
        </NeonText>
      </div>
      <div className={styles.chartArea} ref={containerRef}>
        <svg ref={svgRef} className={styles.chart} />
        <div ref={tooltipRef} className={styles.tooltip} />
      </div>
    </GlassPanel>
  );
};

PNLChart.displayName = 'PNLChart';
