'use client';

import React, { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { NeonText, Table, Badge, Input, GlassPanel, Spinner, Button } from '@/components/ui';
import type { TableColumn } from '@/components/ui';
import { api } from '@/lib/api';
import { truncateAddress } from '@/lib/solana';
import { formatTimeAgo } from '@/lib/formatters';
import { useDebounce } from '@/hooks/useDebounce';
import type { AnalysisSummary } from '@/types/analysis';
import styles from './page.module.css';

const PAGE_SIZE = 20;

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

function formatRow(item: AnalysisSummary) {
  const tokenName = item.token?.name ?? 'Unknown';
  const tokenSymbol = item.token?.symbol ?? '???';
  const contractAddress = item.token?.contract_address ?? '';

  return {
    tokenName: (
      <span className={styles.tokenName}>{tokenName}</span>
    ),
    symbol: (
      <Badge variant="cyan">{tokenSymbol}</Badge>
    ),
    contractAddress: (
      <span className={styles.address}>
        {contractAddress ? truncateAddress(contractAddress, 6) : '--'}
      </span>
    ),
    riskScore: (
      <span className={styles.riskScore}>
        {item.risk_score !== null ? (
          <Badge variant={getRiskBadgeVariant(item.risk_score)}>
            {item.risk_score}
          </Badge>
        ) : (
          <span className={styles.pending}>--</span>
        )}
      </span>
    ),
    walletCount: (
      <span className={styles.walletCount}>
        {item.wallet_count || '--'}
      </span>
    ),
    date: (
      <span className={styles.date}>
        {item.started_at ? formatTimeAgo(item.started_at) : '--'}
      </span>
    ),
    status: (
      <Badge variant={getStatusVariant(item.status)}>
        {item.status.toUpperCase()}
      </Badge>
    ),
    action: (
      <Link href={`/analysis/${item.analysis_id}`} className={styles.viewLink}>
        View
      </Link>
    ),
    // For sorting
    _riskScore: item.risk_score ?? -1,
    _walletCount: item.wallet_count,
    _date: item.started_at ? new Date(item.started_at).getTime() : 0,
  };
}

export default function HistoryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const debouncedQuery = useDebounce(searchQuery, 300);

  // Reset to page 1 when search query changes
  const effectiveQuery = debouncedQuery;
  const offset = (page - 1) * PAGE_SIZE;

  // Fetch history with pagination and search
  const {
    data: historyData,
    isLoading: historyLoading,
    isError: historyError,
  } = useQuery({
    queryKey: ['history', effectiveQuery, page],
    queryFn: () =>
      api.getHistory({
        query: effectiveQuery || undefined,
        limit: PAGE_SIZE,
        offset,
      }),
  });

  // Fetch trending tokens
  const { data: trendingData } = useQuery({
    queryKey: ['trending'],
    queryFn: () => api.getTrending(),
  });

  // Reset page when query changes
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPage(1);
  }, []);

  const items = historyData?.items ?? [];
  const total = historyData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rows = useMemo(() => items.map(formatRow), [items]);

  return (
    <div className={styles.historyPage}>
      <header className={styles.header}>
        <NeonText as="h1" color="cyan" glow className={styles.title}>
          History
        </NeonText>
      </header>

      {/* Trending */}
      {trendingData && trendingData.length > 0 && (
        <div className={styles.trendingSection}>
          <span className={styles.trendingHeading}>Trending</span>
          <div className={styles.trendingGrid}>
            {trendingData.map((token) => (
              <button
                key={token.contract_address}
                className={styles.trendingChip}
                onClick={() => {
                  setSearchQuery(token.name);
                  setPage(1);
                }}
                type="button"
              >
                <span className={styles.trendingName}>{token.name}</span>
                <span className={styles.trendingSymbol}>{token.symbol}</span>
                <span className={styles.trendingCount}>
                  {token.scan_count} scan{token.scan_count !== 1 ? 's' : ''}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className={styles.searchSection}>
        <Input
          placeholder="Search by token name, symbol, or address..."
          value={searchQuery}
          onChange={handleSearchChange}
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

      {/* Loading */}
      {historyLoading && (
        <GlassPanel className={styles.loadingState}>
          <Spinner size="lg" color="cyan" />
        </GlassPanel>
      )}

      {/* Error */}
      {historyError && (
        <GlassPanel className={styles.emptyState}>
          <span className={styles.emptyText}>
            Failed to load history. Please try again.
          </span>
        </GlassPanel>
      )}

      {/* Table */}
      {!historyLoading && !historyError && (
        <>
          {items.length === 0 ? (
            <GlassPanel className={styles.emptyState}>
              <span className={styles.emptyText}>
                {debouncedQuery
                  ? `No results for "${debouncedQuery}"`
                  : 'No analysis history yet'}
              </span>
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

          {/* Pagination */}
          {total > PAGE_SIZE && (
            <div className={styles.pagination}>
              <Button
                variant="ghost"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </Button>
              <span className={styles.pageInfo}>
                {page} / {totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
