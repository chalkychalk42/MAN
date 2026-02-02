'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { GlassPanel, NeonText } from '@/components/ui';
import { api } from '@/lib/api';
import styles from './QuickStats.module.css';

interface StatConfig {
  label: string;
  color: 'cyan' | 'green' | 'purple' | 'orange';
  icon: string;
  getValue: (data: StatsData | undefined) => string;
}

interface StatsData {
  totalAnalyses: number;
  tokensTracked: number;
  walletsScored: number;
}

const STAT_CONFIGS: StatConfig[] = [
  {
    label: 'Total Analyses',
    color: 'cyan',
    icon: '\u{1F50D}',
    getValue: (d) => d ? d.totalAnalyses.toLocaleString() : '--',
  },
  {
    label: 'Tokens Tracked',
    color: 'purple',
    icon: '\u{1FA99}',
    getValue: (d) => d ? d.tokensTracked.toLocaleString() : '--',
  },
  {
    label: 'Wallets Scored',
    color: 'green',
    icon: '\u{1F4B3}',
    getValue: (d) => d ? d.walletsScored.toLocaleString() : '--',
  },
];

export const QuickStats: React.FC = () => {
  const { data: statsData, isLoading } = useQuery({
    queryKey: ['quickStats'],
    queryFn: async (): Promise<StatsData> => {
      // Fetch a page of history to get total count and compute unique tokens/wallets
      const historyResponse = await api.getHistory({ limit: 100, offset: 0 });

      const totalAnalyses = historyResponse.total;

      // Count unique tokens from the items we received
      const uniqueTokens = new Set<string>();
      let totalWallets = 0;

      for (const item of historyResponse.items) {
        if (item.token?.contract_address) {
          uniqueTokens.add(item.token.contract_address);
        }
        totalWallets += item.wallet_count;
      }

      return {
        totalAnalyses,
        tokensTracked: uniqueTokens.size,
        walletsScored: totalWallets,
      };
    },
    refetchInterval: 30_000,
  });

  return (
    <div className={styles.statsBar}>
      {STAT_CONFIGS.map((stat) => (
        <GlassPanel key={stat.label} variant="compact" className={styles.statCard}>
          <span className={styles.statIcon} aria-hidden="true">
            {stat.icon}
          </span>
          <span className={styles.statLabel}>{stat.label}</span>
          {isLoading ? (
            <span className={styles.skeleton} />
          ) : (
            <NeonText color={stat.color} glow className={styles.statValue}>
              {stat.getValue(statsData)}
            </NeonText>
          )}
        </GlassPanel>
      ))}
    </div>
  );
};

QuickStats.displayName = 'QuickStats';
