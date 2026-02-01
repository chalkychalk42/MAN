'use client';

import React, { useState, useCallback } from 'react';
import { GlassPanel, Badge, NeonText } from '@/components/ui';
import { formatSol, formatPercentage, formatNumber } from '@/lib/formatters';
import type { WalletProfile as WalletProfileType } from '@/types/wallet';
import styles from './WalletProfile.module.css';

interface WalletProfileProps {
  wallet: WalletProfileType | null;
  address: string;
}

interface StatCardProps {
  label: string;
  value: string;
  color: 'cyan' | 'green' | 'purple' | 'orange' | 'pink';
}

function StatCard({ label, value, color }: StatCardProps) {
  return (
    <div className={styles.statCard}>
      <span className={styles.statLabel}>{label}</span>
      <NeonText color={color} className={styles.statValue}>
        {value}
      </NeonText>
    </div>
  );
}

export const WalletProfile: React.FC<WalletProfileProps> = ({ wallet, address }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  }, [address]);

  return (
    <GlassPanel className={styles.container}>
      {/* Address + Copy */}
      <div className={styles.addressRow}>
        <span className={styles.address}>{address}</span>
        <button className={styles.copyButton} onClick={handleCopy} title="Copy address">
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      {/* Labels / Tags */}
      {wallet && (
        <div className={styles.tagsRow}>
          {wallet.label && (
            <Badge variant="purple">{wallet.label}</Badge>
          )}
          {wallet.tags.map((tag) => (
            <Badge key={tag} variant="cyan">{tag}</Badge>
          ))}
          {wallet.tags.length === 0 && !wallet.label && (
            <span className={styles.noTags}>No labels</span>
          )}
        </div>
      )}

      {/* Stats Row */}
      <div className={styles.statsRow}>
        <StatCard
          label="Total PNL"
          value={wallet ? formatSol(wallet.total_pnl_sol) : '--'}
          color="green"
        />
        <StatCard
          label="Win Rate"
          value={wallet ? formatPercentage(wallet.win_rate) : '--'}
          color="cyan"
        />
        <StatCard
          label="Total Trades"
          value={wallet ? formatNumber(wallet.total_trades) : '--'}
          color="purple"
        />
        <StatCard
          label="Insider Score"
          value={wallet ? String(wallet.insider_score) : '--'}
          color="orange"
        />
        <StatCard
          label="Risk Score"
          value={wallet ? String(wallet.risk_score) : '--'}
          color="pink"
        />
      </div>
    </GlassPanel>
  );
};

WalletProfile.displayName = 'WalletProfile';
