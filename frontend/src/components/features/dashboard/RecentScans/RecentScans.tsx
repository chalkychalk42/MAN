'use client';

import React from 'react';
import Link from 'next/link';
import { GlassPanel, Badge, NeonText } from '@/components/ui';
import { truncateAddress } from '@/lib/solana';
import { formatTimeAgo } from '@/lib/formatters';
import styles from './RecentScans.module.css';

interface ScanItem {
  analysisId: string;
  tokenName: string;
  tokenSymbol: string;
  contractAddress: string;
  riskScore: number;
  createdAt: string;
}

const MOCK_SCANS: ScanItem[] = [
  {
    analysisId: 'a1b2c3d4',
    tokenName: 'Degen Pepe',
    tokenSymbol: 'DPEPE',
    contractAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    riskScore: 78,
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    analysisId: 'e5f6g7h8',
    tokenName: 'Moon Bonk',
    tokenSymbol: 'MBONK',
    contractAddress: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    riskScore: 42,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    analysisId: 'i9j0k1l2',
    tokenName: 'SolCat',
    tokenSymbol: 'SCAT',
    contractAddress: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    riskScore: 15,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    analysisId: 'm3n4o5p6',
    tokenName: 'Rug Magnet',
    tokenSymbol: 'RUGM',
    contractAddress: 'So11111111111111111111111111111111111111112',
    riskScore: 92,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
  },
  {
    analysisId: 'q7r8s9t0',
    tokenName: 'Based AI',
    tokenSymbol: 'BAI',
    contractAddress: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',
    riskScore: 55,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
];

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
  const scans = MOCK_SCANS;

  return (
    <div className={styles.container}>
      <h3 className={styles.sectionHeading}>Recent Scans</h3>

      {scans.length === 0 ? (
        <GlassPanel className={styles.emptyState}>
          <p className={styles.emptyText}>
            No scans yet. Deploy your first agents above!
          </p>
        </GlassPanel>
      ) : (
        <div className={styles.grid}>
          {scans.map((scan) => {
            const riskColor = getRiskColor(scan.riskScore);
            return (
              <Link
                key={scan.analysisId}
                href={`/analysis/${scan.analysisId}`}
                className={styles.cardLink}
              >
                <GlassPanel className={styles.card}>
                  <div className={styles.cardHeader}>
                    <span className={styles.tokenName}>{scan.tokenName}</span>
                    <Badge variant="cyan">{scan.tokenSymbol}</Badge>
                  </div>

                  <div className={styles.cardAddress}>
                    {truncateAddress(scan.contractAddress, 6)}
                  </div>

                  <div className={styles.cardFooter}>
                    <div className={styles.riskDisplay}>
                      <NeonText color={riskColor === 'yellow' ? 'orange' : riskColor} glow className={styles.riskScore}>
                        {scan.riskScore}
                      </NeonText>
                      <span className={styles.riskLabel}>
                        {getRiskLabel(scan.riskScore)} Risk
                      </span>
                    </div>
                    <span className={styles.timeAgo}>
                      {formatTimeAgo(scan.createdAt)}
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
