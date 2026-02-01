'use client';

import React, { useState } from 'react';
import { GlassPanel, Table, Badge, Button, NeonText } from '@/components/ui';
import type { TableColumn } from '@/components/ui';
import { truncateAddress } from '@/lib/solana';
import { formatSol, formatNumber } from '@/lib/formatters';
import styles from './TransactionHistory.module.css';

interface TransactionHistoryProps {
  address: string;
}

interface MockTransaction {
  signature: string;
  time: string;
  type: 'buy' | 'sell' | 'transfer';
  amount: number;
  solValue: number;
}

const MOCK_TRANSACTIONS: MockTransaction[] = [
  {
    signature: '3xR4kPvqNfLmSJb82nWVe9M2Ygp6zr4TkqSfjAJfSQyH',
    time: '2025-01-15T14:32:00Z',
    type: 'buy',
    amount: 1500000,
    solValue: 2.45,
  },
  {
    signature: '5yT6mQwrOgMnUKc93oXWf0N3Zhq7as5UlrTgkBKgUTzJ',
    time: '2025-01-15T12:18:00Z',
    type: 'sell',
    amount: 750000,
    solValue: 3.12,
  },
  {
    signature: '2wS3jNxpHhLkRIa71mVTd8K2Xfp5yr3SjoOblCJdRQxG',
    time: '2025-01-14T22:05:00Z',
    type: 'transfer',
    amount: 250000,
    solValue: 0.85,
  },
  {
    signature: '4zU5lOwsIiNmTJb64nWYg1L3Ahr8bt6VksQchDKeSSyI',
    time: '2025-01-14T18:47:00Z',
    type: 'buy',
    amount: 3200000,
    solValue: 5.67,
  },
  {
    signature: '6aV7nPxtJjOoVLc85pXZh2M4Bis9cu7WltRdiELfTTzK',
    time: '2025-01-14T09:22:00Z',
    type: 'sell',
    amount: 4800000,
    solValue: 12.34,
  },
];

const COLUMNS: TableColumn[] = [
  { key: 'signature', label: 'Signature', mono: true },
  { key: 'time', label: 'Time' },
  { key: 'type', label: 'Type' },
  { key: 'amount', label: 'Amount' },
  { key: 'solValue', label: 'SOL Value' },
];

function getTypeBadgeVariant(type: string): 'green' | 'pink' | 'cyan' {
  switch (type) {
    case 'buy':
      return 'green';
    case 'sell':
      return 'pink';
    default:
      return 'cyan';
  }
}

function formatRow(tx: MockTransaction) {
  return {
    signature: (
      <a
        href={`https://solscan.io/tx/${tx.signature}`}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.sigLink}
      >
        {truncateAddress(tx.signature, 6)}
      </a>
    ),
    time: (
      <span className={styles.timeText}>
        {new Date(tx.time).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </span>
    ),
    type: (
      <Badge variant={getTypeBadgeVariant(tx.type)}>
        {tx.type.toUpperCase()}
      </Badge>
    ),
    amount: (
      <span className={styles.amountText}>
        {formatNumber(tx.amount)}
      </span>
    ),
    solValue: (
      <span className={styles.solText}>
        {formatSol(tx.solValue)}
      </span>
    ),
  };
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({ address }) => {
  const [visibleCount, setVisibleCount] = useState(5);
  const transactions = MOCK_TRANSACTIONS;
  const visibleTransactions = transactions.slice(0, visibleCount);
  const rows = visibleTransactions.map(formatRow);
  const hasMore = visibleCount < transactions.length;

  return (
    <GlassPanel className={styles.container}>
      <div className={styles.header}>
        <NeonText as="h3" color="cyan" className={styles.heading}>
          Transaction History
        </NeonText>
        <span className={styles.count}>
          {transactions.length} transactions
        </span>
      </div>

      <Table
        columns={COLUMNS}
        data={rows}
        emptyMessage="No transactions found."
        className={styles.table}
      />

      {hasMore && (
        <div className={styles.loadMoreRow}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setVisibleCount((prev) => prev + 10)}
          >
            Load More
          </Button>
        </div>
      )}
    </GlassPanel>
  );
};

TransactionHistory.displayName = 'TransactionHistory';
