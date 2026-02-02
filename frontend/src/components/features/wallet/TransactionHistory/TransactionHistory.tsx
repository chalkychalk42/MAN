'use client';

import React, { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GlassPanel, Table, Badge, Button, NeonText, Tooltip } from '@/components/ui';
import type { TableColumn, SortDirection } from '@/components/ui';
import { truncateAddress } from '@/lib/solana';
import { formatSol, formatCurrency, formatNumber, formatTimeAgo } from '@/lib/formatters';
import { api } from '@/lib/api';
import type { Transaction } from '@/types/wallet';
import styles from './TransactionHistory.module.css';

interface TransactionHistoryProps {
  address: string;
}

const PAGE_LIMIT = 20;

const COLUMNS: TableColumn[] = [
  { key: 'time', label: 'Time', sortable: true },
  { key: 'type', label: 'Type', sortable: true },
  { key: 'token', label: 'Token' },
  { key: 'amount', label: 'Amount', sortable: true },
  { key: 'solValue', label: 'SOL Value', sortable: true },
  { key: 'usdValue', label: 'USD Value', sortable: true },
  { key: 'signature', label: 'Signature', mono: true },
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

function formatAbsoluteTime(timestamp: string): string {
  return new Date(timestamp).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function sortTransactions(
  transactions: Transaction[],
  sortBy: string,
  sortDir: SortDirection
): Transaction[] {
  const sorted = [...transactions];

  sorted.sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'time':
        comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        break;
      case 'type':
        comparison = a.type.localeCompare(b.type);
        break;
      case 'amount':
        comparison = a.amount - b.amount;
        break;
      case 'solValue':
        comparison = a.sol_value - b.sol_value;
        break;
      case 'usdValue':
        comparison = (a.usd_value ?? 0) - (b.usd_value ?? 0);
        break;
      default:
        return 0;
    }

    return sortDir === 'asc' ? comparison : -comparison;
  });

  return sorted;
}

function formatRow(tx: Transaction) {
  return {
    time: (
      <Tooltip content={formatAbsoluteTime(tx.timestamp)} position="right">
        <span className={styles.timeText}>
          {formatTimeAgo(tx.timestamp)}
        </span>
      </Tooltip>
    ),
    type: (
      <Badge variant={getTypeBadgeVariant(tx.type)}>
        {tx.type.toUpperCase()}
      </Badge>
    ),
    token: (
      <span className={styles.tokenText}>
        {tx.token_name || (tx.token_address ? truncateAddress(tx.token_address, 4) : '--')}
      </span>
    ),
    amount: (
      <span className={styles.amountText}>
        {formatNumber(tx.amount)}
      </span>
    ),
    solValue: (
      <span className={styles.solText}>
        {formatSol(tx.sol_value)}
      </span>
    ),
    usdValue: (
      <span className={styles.usdText}>
        {tx.usd_value != null ? formatCurrency(tx.usd_value) : '--'}
      </span>
    ),
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
    _type: tx.type,
  };
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({ address }) => {
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('time');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['walletTransactions', address, page],
    queryFn: () => api.getWalletTransactions(address, { page, limit: PAGE_LIMIT }),
  });

  const handleSort = useCallback(
    (key: string) => {
      if (sortBy === key) {
        setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortBy(key);
        setSortDir('desc');
      }
    },
    [sortBy]
  );

  const transactions = data?.transactions ?? [];
  const total = data?.total ?? 0;
  const hasMore = data?.has_more ?? false;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  const sortedTransactions = sortTransactions(transactions, sortBy, sortDir);
  const rows = sortedTransactions.map(formatRow);

  // Generate page numbers for pagination
  const pageNumbers: number[] = [];
  const maxVisiblePages = 5;
  let startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2));
  const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
  startPage = Math.max(1, endPage - maxVisiblePages + 1);

  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }

  // Loading skeleton
  if (isLoading) {
    return (
      <GlassPanel className={styles.container}>
        <div className={styles.header}>
          <NeonText as="h3" color="cyan" className={styles.heading}>
            Transaction History
          </NeonText>
        </div>
        <div className={styles.skeletonTable}>
          <div className={styles.skeletonHeaderRow} />
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={styles.skeletonRow} />
          ))}
        </div>
      </GlassPanel>
    );
  }

  // Error state
  if (isError) {
    return (
      <GlassPanel className={styles.container}>
        <div className={styles.header}>
          <NeonText as="h3" color="cyan" className={styles.heading}>
            Transaction History
          </NeonText>
        </div>
        <div className={styles.errorState}>
          <NeonText color="pink">Failed to load transactions.</NeonText>
        </div>
      </GlassPanel>
    );
  }

  return (
    <GlassPanel className={styles.container}>
      <div className={styles.header}>
        <NeonText as="h3" color="cyan" className={styles.heading}>
          Transaction History
        </NeonText>
        <span className={styles.count}>
          {total > 0 ? `${formatNumber(total)} transactions` : 'No transactions'}
        </span>
      </div>

      <div className={styles.tableWrapper}>
        <Table
          columns={COLUMNS}
          data={rows as Record<string, unknown>[]}
          onSort={handleSort}
          sortBy={sortBy}
          sortDir={sortDir}
          emptyMessage="No transactions found for this wallet."
          className={styles.table}
        />
      </div>

      {/* Pagination */}
      {total > PAGE_LIMIT && (
        <div className={styles.pagination}>
          <Button
            variant="ghost"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </Button>

          {startPage > 1 && (
            <>
              <button
                className={styles.pageButton}
                onClick={() => setPage(1)}
              >
                1
              </button>
              {startPage > 2 && (
                <span className={styles.pageEllipsis}>...</span>
              )}
            </>
          )}

          {pageNumbers.map((num) => (
            <button
              key={num}
              className={`${styles.pageButton} ${num === page ? styles.pageActive : ''}`}
              onClick={() => setPage(num)}
            >
              {num}
            </button>
          ))}

          {endPage < totalPages && (
            <>
              {endPage < totalPages - 1 && (
                <span className={styles.pageEllipsis}>...</span>
              )}
              <button
                className={styles.pageButton}
                onClick={() => setPage(totalPages)}
              >
                {totalPages}
              </button>
            </>
          )}

          <Button
            variant="ghost"
            size="sm"
            disabled={!hasMore && page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      )}
    </GlassPanel>
  );
};

TransactionHistory.displayName = 'TransactionHistory';
