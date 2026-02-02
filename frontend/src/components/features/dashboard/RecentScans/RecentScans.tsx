'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { GlassPanel, Badge, NeonText, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { truncateAddress } from '@/lib/solana';
import { formatTimeAgo } from '@/lib/formatters';
import styles from './RecentScans.module.css';

function getRiskColor(score: number): 'green' | 'yellow' | 'pink' {
  if (score < 30) return 'green';
  if (score <= 60) return 'yellow';
  return 'pink';
}

function getRiskLabel(score: number): string {
  if (score < 30) return 'Low';
  if (score <= 60) return 'Medium';
  return 'High';
}

export const RecentScans: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['recentScans'],
    queryFn: () => api.getHistory({ limit: 5, offset: 0 }),
  });

  const scans = data?.items ?? [];

  return (
    <div className={styles.container}>
      <h3 className={styles.sectionHeading}>Recent Scans</h3>

      {isLoading ? (
        <GlassPanel className={styles.loadingState}>
          <Spinner size="lg" color="cyan" />
        </GlassPanel>
      ) : scans.length === 0 ? (
        <GlassPanel className={styles.emptyState}>
          <p className={styles.emptyText}>
            No scans yet. Try analyzing a token!
          </p>
        </GlassPanel>
      ) : (
        <div className={styles.grid}>
          {scans.map((scan) => {
            const tokenName = scan.token?.name ?? 'Unknown';
            const tokenSymbol = scan.token?.symbol ?? '???';
            const contractAddress = scan.token?.contract_address ?? '';
            const hasRisk = scan.risk_score !== null;
            const riskColor = hasRisk ? getRiskColor(scan.risk_score!) : undefined;

            return (
              <Link
                key={scan.analysis_id}
                href={`/analysis/${scan.analysis_id}`}
                className={styles.cardLink}
              >
                <GlassPanel className={styles.card}>
                  <div className={styles.cardHeader}>
                    <span className={styles.tokenName}>{tokenName}</span>
                    <Badge variant="cyan">{tokenSymbol}</Badge>
                  </div>

                  <div className={styles.cardAddress}>
                    {contractAddress
                      ? truncateAddress(contractAddress, 6)
                      : '--'}
                  </div>

                  <div className={styles.cardFooter}>
                    <div className={styles.riskDisplay}>
                      {hasRisk ? (
                        <>
                          <NeonText
                            color={riskColor === 'yellow' ? 'orange' : riskColor!}
                            glow
                            className={styles.riskScore}
                          >
                            {scan.risk_score}
                          </NeonText>
                          <span className={styles.riskLabel}>
                            {getRiskLabel(scan.risk_score!)} Risk
                          </span>
                        </>
                      ) : (
                        <span className={styles.pendingScore}>--</span>
                      )}
                    </div>
                    <span className={styles.timeAgo}>
                      {scan.started_at
                        ? formatTimeAgo(scan.started_at)
                        : '--'}
                    </span>
                  </div>
                </GlassPanel>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

RecentScans.displayName = 'RecentScans';
