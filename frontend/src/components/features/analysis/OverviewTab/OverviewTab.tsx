'use client';

import React, { useState, useCallback } from 'react';
import { GlassPanel, Badge, NeonText } from '@/components/ui';
import { useAnalysisStore } from '@/stores/useAnalysisStore';
import { truncateAddress } from '@/lib/solana';
import { formatSol, formatNumber, formatTimeAgo } from '@/lib/formatters';
import { RiskGauge } from '@/components/features/analysis/RiskGauge';
import styles from './OverviewTab.module.css';

export const OverviewTab: React.FC = () => {
  const tokenData = useAnalysisStore((state) => state.tokenData);
  const riskScore = useAnalysisStore((state) => state.riskScore);
  const status = useAnalysisStore((state) => state.status);
  const [copied, setCopied] = useState(false);

  const handleCopyAddress = useCallback(async () => {
    if (!tokenData?.contract_address) return;
    try {
      await navigator.clipboard.writeText(tokenData.contract_address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  }, [tokenData?.contract_address]);

  const isLoading = status === 'running' && !tokenData;

  if (isLoading) {
    return (
      <div className={styles.grid}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={styles.skeletonCard} />
        ))}
      </div>
    );
  }

  return (
    <div className={styles.grid}>
      {/* Token Name + Symbol */}
      <GlassPanel className={styles.card}>
        <span className={styles.cardLabel}>Token</span>
        <div className={styles.tokenRow}>
          <NeonText color="cyan" className={styles.tokenName}>
            {tokenData?.name || 'Unknown'}
          </NeonText>
          {tokenData?.symbol && (
            <Badge variant="cyan">{tokenData.symbol}</Badge>
          )}
        </div>
      </GlassPanel>

      {/* Contract Address */}
      <GlassPanel className={styles.card}>
        <span className={styles.cardLabel}>Contract Address</span>
        <div className={styles.addressRow}>
          <span className={styles.address}>
            {tokenData?.contract_address
              ? truncateAddress(tokenData.contract_address, 8)
              : '--'}
          </span>
          {tokenData?.contract_address && (
            <button
              className={styles.copyButton}
              onClick={handleCopyAddress}
              title="Copy address"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          )}
        </div>
      </GlassPanel>

      {/* Launch Time */}
      <GlassPanel className={styles.card}>
        <span className={styles.cardLabel}>Launch Time</span>
        <NeonText color="purple" className={styles.statValue}>
          {tokenData?.launch_timestamp
            ? formatTimeAgo(tokenData.launch_timestamp)
            : '--'}
        </NeonText>
      </GlassPanel>

      {/* Liquidity */}
      <GlassPanel className={styles.card}>
        <span className={styles.cardLabel}>Liquidity</span>
        <NeonText color="green" className={styles.statValue}>
          {tokenData?.liquidity_sol != null
            ? formatSol(tokenData.liquidity_sol)
            : '--'}
        </NeonText>
      </GlassPanel>

      {/* Holder Count */}
      <GlassPanel className={styles.card}>
        <span className={styles.cardLabel}>Holders</span>
        <NeonText color="orange" className={styles.statValue}>
          {tokenData?.holder_count != null
            ? formatNumber(tokenData.holder_count)
            : '--'}
        </NeonText>
      </GlassPanel>

      {/* Risk Score */}
      <GlassPanel className={styles.riskCard}>
        <span className={styles.cardLabel}>Risk Score</span>
        {riskScore != null ? (
          <RiskGauge score={riskScore} size={130} />
        ) : (
          <div className={styles.riskPending}>
            <span className={styles.riskDash}>--</span>
            <span className={styles.riskPendingLabel}>Analyzing...</span>
          </div>
        )}
      </GlassPanel>
    </div>
  );
};

OverviewTab.displayName = 'OverviewTab';
