'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { NeonText, Table, Badge, Input, GlassPanel } from '@/components/ui';
import type { TableColumn } from '@/components/ui';
import { truncateAddress } from '@/lib/solana';
import { formatTimeAgo } from '@/lib/formatters';
import { useDebounce } from '@/hooks/useDebounce';
import styles from './page.module.css';

interface HistoryItem {
  analysisId: string;
  tokenName: string;
  tokenSymbol: string;
  contractAddress: string;
  riskScore: number | null;
  walletCount: number;
  createdAt: string;
  status: 'complete' | 'running' | 'error' | 'queued';
}

const MOCK_HISTORY: HistoryItem[] = [
  {
    analysisId: 'a1b2c3d4',
    tokenName: 'Degen Pepe',
    tokenSymbol: 'DPEPE',
    contractAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    riskScore: 78,
    walletCount: 142,
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    status: 'complete',
  },
  {
    analysisId: 'e5f6g7h8',
    tokenName: 'Moon Bonk',
    tokenSymbol: 'MBONK',
    contractAddress: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    riskScore: 42,
    walletCount: 89,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    status: 'complete',
  },
  {
    analysisId: 'i9j0k1l2',
    tokenName: 'SolCat',
    tokenSymbol: 'SCAT',
    contractAddress: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    riskScore: 15,
    walletCount: 234,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    status: 'complete',
  },
  {
    analysisId: 'm3n4o5p6',
    tokenName: 'Rug Magnet',
    tokenSymbol: 'RUGM',
    contractAddress: 'So11111111111111111111111111111111111111112',
    riskScore: 92,
    walletCount: 56,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    status: 'complete',
  },
  {
    analysisId: 'q7r8s9t0',
    tokenName: 'Based AI',
    tokenSymbol: 'BAI',
    contractAddress: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',
    riskScore: null,
    walletCount: 0,
    createdAt: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
    status: 'running',
  },
  {
    analysisId: 'u1v2w3x4',
    tokenName: 'Pump Token',
    tokenSymbol: 'PUMP',
    contractAddress: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
    riskScore: 67,
    walletCount: 312,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    status: 'complete',
  },
];

const COLUMNS: TableColumn[] = [
  { key: 'tokenName', label: 'Token' },
  { key: 'symbol', label: 'Symbol' },
  { key: 'contractAddress', label: 'Contract' },
  { key: 'riskScore', label: 'Risk Score', sortable: true },
  { key: 'walletCount', label: 'Wallets', sortable: true },
  { key: 'date', label: 'Date', sortable: true },
  { key: 'status', label: 'Status' },
  { key: 'action', label: '' },
];

function getRiskBadgeVariant(score: number | null): 'green' | 'yellow' | 'pink' | 'cyan' {
  if (score === null) return 'cyan';
  if (score < 30) return 'green';
  if (score <= 60) return 'yellow';
  return 'pink';
}

function getStatusVariant(status: string): 'green' | 'cyan' | 'pink' | 'orange' {
  switch (status) {
    case 'complete':
      return 'green';
    case 'running':
      return 'cyan';
    case 'error':
      return 'pink';
    default:
      return 'orange';
  }
}

function formatRow(item: HistoryItem) {
  return {
    tokenName: (
      <span className={styles.tokenName}>{item.tokenName}</span>
    ),
    symbol: (
      <Badge variant="cyan">{item.tokenSymbol}</Badge>
    ),
    contractAddress: (
      <span className={styles.address}>
        {truncateAddress(item.contractAddress, 6)}
      </span>
    ),
    riskScore: (
      <span className={styles.riskScore}>
        {item.riskScore !== null ? (
          <Badge variant={getRiskBadgeVariant(item.riskScore)}>
            {item.riskScore}
          </Badge>
        ) : (
          <span className={styles.pending}>--</span>
        )}
      </span>
    ),
    walletCount: (
      <span className={styles.walletCount}>
        {item.walletCount || '--'}
      </span>
    ),
    date: (
      <span className={styles.date}>
        {formatTimeAgo(item.createdAt)}
      </span>
    ),
    status: (
      <Badge variant={getStatusVariant(item.status)}>
        {item.status.toUpperCase()}
      </Badge>
    ),
    action: (
      <Link href={`/analysis/${item.analysisId}`} className={styles.viewLink}>
        View
      </Link>
    ),
    // For sorting
    _riskScore: item.riskScore ?? -1,
    _walletCount: item.walletCount,
    _date: new Date(item.createdAt).getTime(),
  };
}

export default function HistoryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebounce(searchQuery, 300);

  const filteredHistory = useMemo(() => {
    if (!debouncedQuery) return MOCK_HISTORY;
    const q = debouncedQuery.toLowerCase();
    return MOCK_HISTORY.filter(
      (item) =>
        item.tokenName.toLowerCase().includes(q) ||
        item.tokenSymbol.toLowerCase().includes(q) ||
        item.contractAddress.toLowerCase().includes(q)
    );
  }, [debouncedQuery]);

  const rows = useMemo(() => filteredHistory.map(formatRow), [filteredHistory]);

  return (
    <div className={styles.historyPage}>
      <header className={styles.header}>
        <NeonText as="h1" color="cyan" glow className={styles.title}>
          History
        </NeonText>
      </header>

      {/* Search */}
      <div className={styles.searchSection}>
        <Input
          placeholder="Search by token name, symbol, or address..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="lg"
          className={styles.searchInput}
          icon={
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          }
        />
      </div>

      {/* Table */}
      {rows.length === 0 && !debouncedQuery ? (
        <GlassPanel className={styles.emptyState}>
          <span className={styles.emptyText}>No analysis history yet</span>
        </GlassPanel>
      ) : (
        <div className={styles.tableSection}>
          <Table
            columns={COLUMNS}
            data={rows}
            emptyMessage={
              debouncedQuery
                ? `No results for "${debouncedQuery}"`
                : 'No analysis history yet'
            }
            className={styles.table}
          />
        </div>
      )}
    </div>
  );
}
