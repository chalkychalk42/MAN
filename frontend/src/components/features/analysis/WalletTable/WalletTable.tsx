'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Table, ProgressBar } from '@/components/ui';
import type { TableColumn, SortDirection } from '@/components/ui';
/* ProgressBar accepts value (0-100), no max prop needed */
import { useAnalysisStore } from '@/stores/useAnalysisStore';
import { truncateAddress } from '@/lib/solana';
import { formatPercentage, formatDuration, formatTimeAgo } from '@/lib/formatters';
import type { WalletScore } from '@/types/wallet';
import styles from './WalletTable.module.css';

const COLUMNS: TableColumn[] = [
  { key: 'rank', label: '#' },
  { key: 'address', label: 'Address', mono: true },
  { key: 'entry_time', label: 'Entry Time', sortable: true },
  { key: 'pnl', label: 'PNL %', sortable: true },
  { key: 'hold_duration', label: 'Hold Duration' },
  { key: 'insider_score', label: 'Insider Score', sortable: true },
  { key: 'actions', label: '' },
];

function formatRow(wallet: WalletScore, index: number) {
  const pnlPositive = wallet.pnl_percentage >= 0;

  return {
    rank: (
      <span className={styles.rank}>{index + 1}</span>
    ),
    address: (
      <Link href={`/wallet/${wallet.address}`} className={styles.addressLink}>
        {truncateAddress(wallet.address, 6)}
      </Link>
    ),
    entry_time: (
      <span className={styles.entryTime}>
        {formatTimeAgo(wallet.entry_time)}
      </span>
    ),
    pnl: (
      <span className={pnlPositive ? styles.pnlPositive : styles.pnlNegative}>
        {formatPercentage(wallet.pnl_percentage)}
      </span>
    ),
    hold_duration: (
      <span className={styles.duration}>
        {formatDuration(wallet.hold_duration_hours)}
      </span>
    ),
    insider_score: (
      <div className={styles.insiderScoreCell}>
        <ProgressBar
          value={wallet.insider_score}
          className={styles.insiderBar}
        />
        <span className={styles.insiderValue}>{wallet.insider_score}</span>
      </div>
    ),
    actions: (
      <Link
        href={`/wallet/${wallet.address}`}
        className={styles.actionLink}
        title="Deep Dive"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
      </Link>
    ),
    // Store raw values for sorting
    _pnl_percentage: wallet.pnl_percentage,
    _insider_score: wallet.insider_score,
    _entry_time: wallet.entry_time,
  };
}

export const WalletTable: React.FC = () => {
  const wallets = useAnalysisStore((state) => state.wallets);
  const status = useAnalysisStore((state) => state.status);
  const [sortBy, setSortBy] = useState<string>('_pnl_percentage');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');

  const sortedWallets = useMemo(() => {
    const sorted = [...wallets];
    sorted.sort((a, b) => {
      let aVal: number, bVal: number;
      switch (sortBy) {
        case 'pnl':
          aVal = a.pnl_percentage;
          bVal = b.pnl_percentage;
          break;
        case 'insider_score':
          aVal = a.insider_score;
          bVal = b.insider_score;
          break;
        case 'entry_time':
          aVal = new Date(a.entry_time).getTime();
          bVal = new Date(b.entry_time).getTime();
          break;
        default:
          return 0;
      }
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });
    return sorted;
  }, [wallets, sortBy, sortDir]);

  const rows = useMemo(
    () => sortedWallets.map((w, i) => formatRow(w, i)),
    [sortedWallets]
  );

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortDir('desc');
    }
  };

  const emptyMessage =
    status === 'running'
      ? 'Analyzing wallets...'
      : 'No wallet data available.';

  return (
    <div className={styles.container}>
      <Table
        columns={COLUMNS}
        data={rows}
        onSort={handleSort}
        sortBy={sortBy}
        sortDir={sortDir}
        emptyMessage={emptyMessage}
        className={styles.table}
      />
    </div>
  );
};

WalletTable.displayName = 'WalletTable';
