'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { GlassPanel, Badge, NeonText } from '@/components/ui';
import { useAnalysisStore } from '@/stores/useAnalysisStore';
import { truncateAddress } from '@/lib/solana';
import {
  formatSol,
  formatCurrency,
  formatNumber,
  formatTimeAgo,
} from '@/lib/formatters';
import { RiskGauge } from '@/components/features/analysis/RiskGauge';
import styles from './OverviewTab.module.css';

function getRiskFactorSeverity(factor: string): 'high' | 'medium' | 'low' {
  const lower = factor.toLowerCase();
  if (
    lower.includes('rug') ||
    lower.includes('scam') ||
    lower.includes('honeypot') ||
    lower.includes('malicious') ||
    lower.includes('drain')
  ) {
    return 'high';
  }
  if (
    lower.includes('whale') ||
    lower.includes('insider') ||
    lower.includes('concentrated') ||
    lower.includes('suspicious')
  ) {
    return 'medium';
  }
  return 'low';
}

function getSeverityColor(severity: 'high' | 'medium' | 'low'): 'pink' | 'orange' | 'cyan' {
  switch (severity) {
    case 'high':
      return 'pink';
    case 'medium':
      return 'orange';
    case 'low':
      return 'cyan';
  }
}

export const OverviewTab: React.FC = () => {
  const tokenData = useAnalysisStore((state) => state.tokenData);
  const wallets = useAnalysisStore((state) => state.wallets);
  const riskScore = useAnalysisStore((state) => state.riskScore);
  const riskFactors = useAnalysisStore((state) => state.riskFactors);
  const flows = useAnalysisStore((state) => state.flows);
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

  // Compute stats
  const totalTransactions = wallets.reduce((sum, w) => sum + (w.pnl_percentage !== undefined ? 1 : 0), 0);
  const uniqueConnections = flows ? flows.links.length : 0;

  // Top 5 wallets by insider_score (descending)
  const topWallets = [...wallets]
    .sort((a, b) => b.insider_score - a.insider_score)
    .slice(0, 5);

  if (isLoading) {
    return (
      <div className={styles.grid}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className={styles.skeletonCard} />
        ))}
      </div>
    );
  }

  if (status === 'idle' && !tokenData) {
    return (
      <div className={styles.emptyState}>
        <NeonText color="cyan" className={styles.emptyText}>
          Start an analysis to see the overview.
        </NeonText>
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      {/* ── Token Metadata Card ─────────────────────────────────── */}
      <GlassPanel className={styles.tokenCard}>
        <div className={styles.tokenHeader}>
          {tokenData?.image_url && (
            <img
              src={tokenData.image_url}
              alt={tokenData.name}
              className={styles.tokenImage}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
          <div className={styles.tokenInfo}>
            <div className={styles.tokenNameRow}>
              <NeonText color="cyan" className={styles.tokenName}>
                {tokenData?.name || 'Unknown'}
              </NeonText>
              {tokenData?.symbol && (
                <Badge variant="cyan">{tokenData.symbol}</Badge>
              )}
            </div>
            {tokenData?.description && (
              <p className={styles.tokenDescription}>{tokenData.description}</p>
            )}
          </div>
        </div>

        <div className={styles.tokenMetaGrid}>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Contract</span>
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
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Supply</span>
            <span className={styles.metaValue}>
              {tokenData?.total_supply
                ? formatNumber(Number(tokenData.total_supply))
                : '--'}
            </span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Holders</span>
            <NeonText color="orange" className={styles.metaValue}>
              {tokenData?.holder_count != null
                ? formatNumber(tokenData.holder_count)
                : '--'}
            </NeonText>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Liquidity</span>
            <NeonText color="green" className={styles.metaValue}>
              {tokenData?.liquidity_sol != null
                ? formatSol(tokenData.liquidity_sol)
                : '--'}
            </NeonText>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Market Cap</span>
            <NeonText color="purple" className={styles.metaValue}>
              {tokenData?.market_cap_usd != null
                ? formatCurrency(tokenData.market_cap_usd)
                : '--'}
            </NeonText>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Launched</span>
            <span className={styles.metaValue}>
              {tokenData?.launch_timestamp
                ? formatTimeAgo(tokenData.launch_timestamp)
                : '--'}
            </span>
          </div>
        </div>
      </GlassPanel>

      {/* ── Stats Grid ──────────────────────────────────────────── */}
      <div className={styles.statsGrid}>
        <GlassPanel className={styles.statCard}>
          <span className={styles.cardLabel}>Wallets Analyzed</span>
          <NeonText color="cyan" className={styles.statValue}>
            {formatNumber(wallets.length)}
          </NeonText>
        </GlassPanel>

        <GlassPanel className={styles.statCard}>
          <span className={styles.cardLabel}>Total Transactions</span>
          <NeonText color="purple" className={styles.statValue}>
            {formatNumber(totalTransactions || wallets.length)}
          </NeonText>
        </GlassPanel>

        <GlassPanel className={styles.statCard}>
          <span className={styles.cardLabel}>Unique Connections</span>
          <NeonText color="orange" className={styles.statValue}>
            {formatNumber(uniqueConnections)}
          </NeonText>
        </GlassPanel>

        <GlassPanel className={styles.riskCard}>
          <span className={styles.cardLabel}>Risk Score</span>
          {riskScore != null ? (
            <RiskGauge score={riskScore} size={130} />
          ) : (
            <div className={styles.riskPending}>
              <span className={styles.riskDash}>--</span>
              <span className={styles.riskPendingLabel}>
                {status === 'running' ? 'Analyzing...' : 'N/A'}
              </span>
            </div>
          )}
        </GlassPanel>
      </div>

      {/* ── Risk Factors ────────────────────────────────────────── */}
      {riskFactors.length > 0 && (
        <GlassPanel className={styles.riskFactorsCard}>
          <NeonText as="h3" color="pink" className={styles.sectionTitle}>
            Risk Factors
          </NeonText>
          <ul className={styles.factorsList}>
            {riskFactors.map((factor, i) => {
              const severity = getRiskFactorSeverity(factor);
              return (
                <li key={i} className={`${styles.factorItem} ${styles[`factor${severity.charAt(0).toUpperCase()}${severity.slice(1)}`]}`}>
                  <span className={`${styles.severityDot} ${styles[`dot${severity.charAt(0).toUpperCase()}${severity.slice(1)}`]}`} />
                  <span className={styles.factorText}>{factor}</span>
                  <Badge variant={getSeverityColor(severity)} className={styles.severityBadge}>
                    {severity.toUpperCase()}
                  </Badge>
                </li>
              );
            })}
          </ul>
        </GlassPanel>
      )}

      {/* ── Top 5 Wallets ───────────────────────────────────────── */}
      {topWallets.length > 0 && (
        <GlassPanel className={styles.topWalletsCard}>
          <div className={styles.topWalletsHeader}>
            <NeonText as="h3" color="cyan" className={styles.sectionTitle}>
              Top Wallets
            </NeonText>
            <span className={styles.topWalletsHint}>by insider score</span>
          </div>
          <div className={styles.walletList}>
            {topWallets.map((w) => (
              <Link
                key={w.address}
                href={`/wallet/${w.address}`}
                className={styles.walletRow}
              >
                <span className={styles.walletAddress}>
                  {truncateAddress(w.address, 6)}
                </span>
                <div className={styles.walletStats}>
                  <NeonText
                    color={w.pnl_sol >= 0 ? 'green' : 'pink'}
                    className={styles.walletPnl}
                  >
                    {formatSol(w.pnl_sol)}
                  </NeonText>
                  <span className={styles.walletInsider}>
                    Insider: {w.insider_score}
                  </span>
                  {w.label && (
                    <Badge variant="purple" className={styles.walletLabel}>
                      {w.label}
                    </Badge>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </GlassPanel>
      )}
    </div>
  );
};

OverviewTab.displayName = 'OverviewTab';
