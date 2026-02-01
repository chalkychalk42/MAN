'use client';

import React from 'react';
import { GlassPanel, NeonText } from '@/components/ui';
import styles from './QuickStats.module.css';

interface StatItem {
  label: string;
  value: string;
  color: 'cyan' | 'green' | 'purple' | 'orange';
}

const stats: StatItem[] = [
  { label: 'Total Scans', value: '0', color: 'cyan' },
  { label: 'Wallets Analyzed', value: '0', color: 'green' },
  { label: 'Tokens Tracked', value: '0', color: 'purple' },
  { label: 'Avg Risk Score', value: '--', color: 'orange' },
];

export const QuickStats: React.FC = () => {
  return (
    <div className={styles.statsBar}>
      {stats.map((stat) => (
        <GlassPanel key={stat.label} variant="compact" className={styles.statCard}>
          <span className={styles.statLabel}>{stat.label}</span>
          <NeonText color={stat.color} glow className={styles.statValue}>
            {stat.value}
          </NeonText>
        </GlassPanel>
      ))}
    </div>
  );
};

QuickStats.displayName = 'QuickStats';
