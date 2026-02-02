'use client';

import React, { useState, useCallback } from 'react';
import { GlassPanel, Badge, NeonText, ProgressBar, Tooltip } from '@/components/ui';
import {
  formatSol,
  formatCurrency,
  formatPercentage,
  formatNumber,
  formatTimeAgo,
} from '@/lib/formatters';
import type { WalletProfile as WalletProfileType } from '@/types/wallet';
import styles from './WalletProfile.module.css';

interface WalletProfileProps {
  wallet: WalletProfileType | null;
  address: string;
}

function getRiskAccentClass(riskScore: number): string {
  if (riskScore < 30) return styles.accentGreen;
  if (riskScore <= 60) return styles.accentOrange;
  return styles.accentPink;
}

function getScoreColor(score: number): 'green' | 'orange' | 'pink' {
  if (score < 30) return 'green';
  if (score <= 60) return 'orange';
  return 'pink';
}

function getPnlColor(pnl: number): 'green' | 'pink' {
  return pnl >= 0 ? 'green' : 'pink';
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '--';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
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

  // Loading skeleton
  if (!wallet) {
    return (
      <GlassPanel className={styles.container}>
        <div className={styles.skeletonRow}>
          <div className={styles.skeletonAddress} />
          <div className={styles.skeletonButton} />
        </div>
        <div className={styles.skeletonTags}>
          <div className={styles.skeletonTag} />
          <div className={styles.skeletonTag} />
        </div>
        <div className={styles.statsRow}>
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className={styles.skeletonStat} />
          ))}
        </div>
      </GlassPanel>
    );
  }

  const accentClass = getRiskAccentClass(wallet.risk_score);

  return (
    <GlassPanel className={`${styles.container} ${accentClass}`}>
      {/* Address Row */}
      <div className={styles.addressRow}>
        <span className={styles.address}>{address}</span>
        <button
          className={`${styles.copyButton} ${copied ? styles.copyButtonCopied : ''}`}
          onClick={handleCopy}
          title="Copy address"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
        <a
          className={styles.externalLink}
          href={`https://solscan.io/account/${address}`}
          target="_blank"
          rel="noopener noreferrer"
          title="View on Solscan"
        >
          Solscan
          <svg
            className={styles.externalIcon}
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M3.5 1.5H1.5V10.5H10.5V8.5M7 1.5H10.5V5M10.25 1.75L5.5 6.5"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </a>
      </div>

      {/* Tags Row */}
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

      {/* Stats Grid */}
      <div className={styles.statsRow}>
        {/* Total PNL */}
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Total PNL</span>
          <NeonText color={getPnlColor(wallet.total_pnl_sol)} className={styles.statValue}>
            {formatSol(wallet.total_pnl_sol)}
          </NeonText>
          <span className={`${styles.statSub} ${wallet.total_pnl_usd >= 0 ? styles.subPositive : styles.subNegative}`}>
            {formatCurrency(wallet.total_pnl_usd)}
          </span>
        </div>

        {/* Win Rate */}
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Win Rate</span>
          <NeonText color="cyan" className={styles.statValue}>
            {formatPercentage(wallet.win_rate)}
          </NeonText>
          <ProgressBar value={wallet.win_rate} color="cyan" className={styles.statBar} />
        </div>

        {/* Total Trades */}
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Total Trades</span>
          <NeonText color="purple" className={styles.statValue}>
            {formatNumber(wallet.total_trades)}
          </NeonText>
        </div>

        {/* Insider Score (single-token) */}
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Token Score</span>
          <Tooltip content={`${wallet.insider_score}/100 - single-token insider signals`}>
            <NeonText color={getScoreColor(wallet.insider_score)} className={styles.statValue}>
              {wallet.insider_score}
            </NeonText>
          </Tooltip>
          <ProgressBar
            value={wallet.insider_score}
            color={getScoreColor(wallet.insider_score)}
            className={styles.statBar}
          />
        </div>

        {/* Cross-Token Score */}
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Cross-Token</span>
          <Tooltip content={`${wallet.cross_token_score ?? '--'}/100 - early entry pattern across ${wallet.tokens_analyzed} tokens`}>
            <NeonText
              color={getScoreColor(wallet.cross_token_score ?? 0)}
              className={styles.statValue}
            >
              {wallet.cross_token_score ?? '--'}
            </NeonText>
          </Tooltip>
          {wallet.cross_token_score != null && (
            <ProgressBar
              value={wallet.cross_token_score}
              color={getScoreColor(wallet.cross_token_score)}
              className={styles.statBar}
            />
          )}
        </div>

        {/* Combined Insider Score */}
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Insider Score</span>
          <Tooltip content={`${wallet.combined_insider_score ?? wallet.insider_score}/100 - combined single + cross-token insider signal`}>
            <NeonText
              color={getScoreColor(wallet.combined_insider_score ?? wallet.insider_score)}
              className={styles.statValue}
            >
              {wallet.combined_insider_score ?? wallet.insider_score}
            </NeonText>
          </Tooltip>
          <ProgressBar
            value={wallet.combined_insider_score ?? wallet.insider_score}
            color={getScoreColor(wallet.combined_insider_score ?? wallet.insider_score)}
            className={styles.statBar}
          />
        </div>

        {/* Early Token Count / Hit Rate */}
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Early Tokens</span>
          <Tooltip
            content={
              wallet.tokens_analyzed > 0
                ? `${wallet.early_token_count} early entries out of ${wallet.tokens_analyzed} tokens analyzed. Hit rate: ${wallet.early_token_hit_rate ?? 0}%`
                : 'No cross-token data available'
            }
          >
            <NeonText color="purple" className={styles.statValue}>
              {wallet.early_token_count}/{wallet.tokens_analyzed}
            </NeonText>
          </Tooltip>
          {wallet.early_token_hit_rate != null && (
            <span className={styles.statSub}>
              {formatPercentage(wallet.early_token_hit_rate)} hit rate
            </span>
          )}
        </div>

        {/* Risk Score */}
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Risk Score</span>
          <Tooltip content={`${wallet.risk_score}/100 - higher indicates more risk`}>
            <NeonText color={getScoreColor(wallet.risk_score)} className={styles.statValue}>
              {wallet.risk_score}
            </NeonText>
          </Tooltip>
          <ProgressBar
            value={wallet.risk_score}
            color={getScoreColor(wallet.risk_score)}
            className={styles.statBar}
          />
        </div>

        {/* First Seen */}
        <div className={styles.statCard}>
          <span className={styles.statLabel}>First Seen</span>
          <Tooltip content={wallet.first_seen_at ? formatDate(wallet.first_seen_at) : 'Unknown'}>
            <NeonText color="cyan" className={styles.statValueSmall}>
              {wallet.first_seen_at ? formatTimeAgo(wallet.first_seen_at) : '--'}
            </NeonText>
          </Tooltip>
        </div>

        {/* Last Active */}
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Last Active</span>
          <Tooltip content={wallet.last_active_at ? formatDate(wallet.last_active_at) : 'Unknown'}>
            <NeonText color="cyan" className={styles.statValueSmall}>
              {wallet.last_active_at ? formatTimeAgo(wallet.last_active_at) : '--'}
            </NeonText>
          </Tooltip>
        </div>
      </div>
    </GlassPanel>
  );
};

WalletProfile.displayName = 'WalletProfile';
