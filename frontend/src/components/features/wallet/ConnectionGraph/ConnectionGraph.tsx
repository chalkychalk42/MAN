'use client';

import React from 'react';
import { GlassPanel, NeonText } from '@/components/ui';
import styles from './ConnectionGraph.module.css';

interface ConnectionGraphProps {
  address: string;
}

export const ConnectionGraph: React.FC<ConnectionGraphProps> = ({ address }) => {
  return (
    <GlassPanel className={styles.container}>
      <div className={styles.header}>
        <NeonText as="h3" color="purple" className={styles.heading}>
          Connected Wallets
        </NeonText>
      </div>

      <div className={styles.placeholder}>
        <svg
          className={styles.icon}
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
        <span className={styles.placeholderTitle}>
          Connection graph visualization
        </span>
        <span className={styles.placeholderSubtext}>
          Interactive network graph of related wallets
        </span>
      </div>
    </GlassPanel>
  );
};

ConnectionGraph.displayName = 'ConnectionGraph';
