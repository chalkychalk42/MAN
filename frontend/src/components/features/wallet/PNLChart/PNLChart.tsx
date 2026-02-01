'use client';

import React from 'react';
import { GlassPanel, NeonText } from '@/components/ui';
import styles from './PNLChart.module.css';

interface PNLChartProps {
  address: string;
}

export const PNLChart: React.FC<PNLChartProps> = ({ address }) => {
  return (
    <GlassPanel className={styles.container}>
      <div className={styles.header}>
        <NeonText as="h3" color="green" className={styles.heading}>
          PNL Over Time
        </NeonText>
      </div>

      <div className={styles.chartArea}>
        {/* Placeholder SVG line chart */}
        <svg
          viewBox="0 0 400 200"
          className={styles.chart}
          preserveAspectRatio="none"
        >
          {/* Grid lines */}
          <line x1="0" y1="50" x2="400" y2="50" className={styles.gridLine} />
          <line x1="0" y1="100" x2="400" y2="100" className={styles.gridLine} />
          <line x1="0" y1="150" x2="400" y2="150" className={styles.gridLine} />

          {/* Area gradient */}
          <defs>
            <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-neon-green)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="var(--color-neon-green)" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--color-neon-cyan)" />
              <stop offset="50%" stopColor="var(--color-neon-green)" />
              <stop offset="100%" stopColor="var(--color-neon-green)" />
            </linearGradient>
          </defs>

          {/* Area fill */}
          <path
            d="M0,160 L40,140 L80,150 L120,120 L160,100 L200,110 L240,80 L280,60 L320,50 L360,30 L400,20 L400,200 L0,200 Z"
            fill="url(#pnlGradient)"
          />

          {/* Line */}
          <path
            d="M0,160 L40,140 L80,150 L120,120 L160,100 L200,110 L240,80 L280,60 L320,50 L360,30 L400,20"
            fill="none"
            stroke="url(#lineGradient)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={styles.line}
          />

          {/* Dot at end */}
          <circle
            cx="400"
            cy="20"
            r="4"
            fill="var(--color-neon-green)"
            className={styles.dot}
          />
        </svg>

        {/* Y-axis labels */}
        <div className={styles.yAxis}>
          <span className={styles.yLabel}>+50 SOL</span>
          <span className={styles.yLabel}>+25 SOL</span>
          <span className={styles.yLabel}>0 SOL</span>
          <span className={styles.yLabel}>-25 SOL</span>
        </div>
      </div>
    </GlassPanel>
  );
};

PNLChart.displayName = 'PNLChart';
