'use client';

import React, { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { NeonText, GlassPanel, Button, Badge, ProgressBar, Spinner } from '@/components/ui';
import { useQueueStore } from '@/stores/useQueueStore';
import { api } from '@/lib/api';
import { isValidSolanaAddress, truncateAddress } from '@/lib/solana';
import type { QueueStatus, BatchStatus, JobSummary } from '@/types/queue';
import styles from './page.module.css';

/* ==========================================================================
   Helpers
   ========================================================================== */

function parseAddresses(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function sortJobs(jobs: JobSummary[]): JobSummary[] {
  const statusOrder: Record<JobSummary['status'], number> = {
    processing: 0,
    pending: 1,
    complete: 2,
    error: 3,
    cancelled: 4,
  };

  return [...jobs].sort((a, b) => {
    const orderDiff = statusOrder[a.status] - statusOrder[b.status];
    if (orderDiff !== 0) return orderDiff;
    // Within complete, sort by risk_score descending (highest risk first)
    if (a.status === 'complete' && b.status === 'complete') {
      return (b.risk_score ?? 0) - (a.risk_score ?? 0);
    }
    return 0;
  });
}

function getRiskClass(score: number): string {
  if (score <= 25) return styles.riskLow;
  if (score <= 50) return styles.riskMedium;
  if (score <= 75) return styles.riskHigh;
  return styles.riskCritical;
}

function getStatusBadgeVariant(status: JobSummary['status']): 'cyan' | 'green' | 'pink' | 'yellow' | 'purple' {
  switch (status) {
    case 'processing': return 'cyan';
    case 'complete': return 'green';
    case 'error': return 'pink';
    case 'pending': return 'yellow';
    case 'cancelled': return 'purple';
  }
}

function getStatusDotClass(status: JobSummary['status']): string {
  switch (status) {
    case 'pending': return styles.statusDotPending;
    case 'processing': return styles.statusDotProcessing;
    case 'complete': return styles.statusDotComplete;
    case 'error': return styles.statusDotError;
    case 'cancelled': return styles.statusDotCancelled;
  }
}

function getJobRowClass(status: JobSummary['status']): string {
  switch (status) {
    case 'pending': return styles.jobRowPending;
    case 'processing': return styles.jobRowProcessing;
    case 'complete': return styles.jobRowComplete;
    case 'error': return styles.jobRowError;
    default: return '';
  }
}

/* ==========================================================================
   Page Component
   ========================================================================== */

export default function QueuePage() {
  const queryClient = useQueryClient();
  const [rawInput, setRawInput] = useState('');
  const activeBatchId = useQueueStore((s) => s.activeBatchId);
  const isSubmitting = useQueueStore((s) => s.isSubmitting);

  // --- Address parsing & validation ---

  const parsedAddresses = useMemo(() => parseAddresses(rawInput), [rawInput]);
  const validAddresses = useMemo(
    () => parsedAddresses.filter(isValidSolanaAddress),
    [parsedAddresses]
  );
  const invalidCount = parsedAddresses.length - validAddresses.length;

  // --- Queue status polling (every 2 seconds) ---

  const { data: queueStatus } = useQuery<QueueStatus>({
    queryKey: ['queueStatus'],
    queryFn: () => api.getQueueStatus(),
    refetchInterval: 2000,
  });

  // --- Batch status polling (every 2 seconds when batch is active) ---

  const { data: batchStatus } = useQuery<BatchStatus>({
    queryKey: ['batchStatus', activeBatchId],
    queryFn: () => api.getBatchStatus(activeBatchId!),
    enabled: !!activeBatchId,
    refetchInterval: 2000,
  });

  // --- Submit batch mutation ---

  const submitMutation = useMutation({
    mutationFn: (addresses: string[]) =>
      useQueueStore.getState().submitBatch(addresses),
    onSuccess: () => {
      setRawInput('');
      queryClient.invalidateQueries({ queryKey: ['queueStatus'] });
    },
  });

  // --- Clear queue mutation ---

  const clearMutation = useMutation({
    mutationFn: () => useQueueStore.getState().clearQueue(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queueStatus'] });
      queryClient.invalidateQueries({ queryKey: ['batchStatus'] });
    },
  });

  const handleSubmit = useCallback(() => {
    if (validAddresses.length === 0) return;
    submitMutation.mutate(validAddresses);
  }, [validAddresses, submitMutation]);

  const handleClear = useCallback(() => {
    clearMutation.mutate();
  }, [clearMutation]);

  // --- Derived batch data ---

  const sortedJobs = useMemo(
    () => (batchStatus ? sortJobs(batchStatus.jobs) : []),
    [batchStatus]
  );

  const batchProgressPercent = batchStatus
    ? batchStatus.total > 0
      ? ((batchStatus.complete + batchStatus.error) / batchStatus.total) * 100
      : 0
    : 0;

  const batchCompletedCount = batchStatus
    ? batchStatus.complete + batchStatus.error
    : 0;

  return (
    <div className={styles.page}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className={styles.header}>
        <NeonText as="h1" color="cyan" glow className={styles.title}>
          Queue
        </NeonText>
      </header>

      {/* ── Batch Submit ───────────────────────────────────────────────── */}
      <section>
        <GlassPanel className={styles.submitSection}>
          <label className={styles.submitLabel} htmlFor="ca-input">
            Paste Contract Addresses (one per line)
          </label>

          <textarea
            id="ca-input"
            className={styles.textarea}
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            placeholder={
              'Paste Solana contract addresses here...\n' +
              'One address per line\n\n' +
              'Example:\n' +
              '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU\n' +
              'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'
            }
            spellCheck={false}
            autoComplete="off"
          />

          <div className={styles.submitFooter}>
            <div className={styles.addressCount}>
              {parsedAddresses.length > 0 && (
                <>
                  <span className={styles.validCount}>
                    {validAddresses.length} valid
                  </span>
                  {invalidCount > 0 && (
                    <span className={styles.invalidCount}>
                      {invalidCount} invalid
                    </span>
                  )}
                </>
              )}
              {parsedAddresses.length === 0 && (
                <span style={{ color: 'var(--color-text-muted)' }}>
                  No addresses entered
                </span>
              )}
            </div>

            <div className={styles.submitActions}>
              <Button
                variant="primary"
                size="md"
                disabled={validAddresses.length === 0 || isSubmitting}
                onClick={handleSubmit}
                className={styles.deployButton}
              >
                {isSubmitting ? (
                  <>
                    <Spinner size="sm" color="cyan" />
                    Deploying...
                  </>
                ) : (
                  <>Deploy Agent Swarm ({validAddresses.length})</>
                )}
              </Button>
            </div>
          </div>

          {submitMutation.error && (
            <p style={{ color: 'var(--color-pink)', fontSize: 'var(--font-size-sm)' }}>
              Failed to submit batch. Please try again.
            </p>
          )}
        </GlassPanel>
      </section>

      {/* ── Queue Dashboard ────────────────────────────────────────────── */}
      <section>
        <div className={styles.statsHeader}>
          <h2 className={styles.statsTitle}>Queue Status</h2>
          <div className={styles.statsActions}>
            {queueStatus && (
              <div className={styles.workerIndicator}>
                <span className={styles.workerDot} />
                {queueStatus.workers_active} workers
              </div>
            )}
            <Button
              variant="danger"
              size="sm"
              onClick={handleClear}
              disabled={clearMutation.isPending}
            >
              {clearMutation.isPending ? 'Clearing...' : 'Clear Queue'}
            </Button>
          </div>
        </div>

        <div className={styles.statsGrid}>
          <GlassPanel variant="compact" className={clsx(styles.statCard, styles.statPending)}>
            <span className={styles.statValue}>
              {queueStatus?.pending ?? 0}
            </span>
            <span className={styles.statLabel}>Pending</span>
          </GlassPanel>

          <GlassPanel variant="compact" className={clsx(styles.statCard, styles.statProcessing)}>
            <span className={styles.statValue}>
              {queueStatus?.processing ?? 0}
            </span>
            <span className={styles.statLabel}>Processing</span>
          </GlassPanel>

          <GlassPanel variant="compact" className={clsx(styles.statCard, styles.statComplete)}>
            <span className={styles.statValue}>
              {queueStatus?.complete ?? 0}
            </span>
            <span className={styles.statLabel}>Complete</span>
          </GlassPanel>

          <GlassPanel variant="compact" className={clsx(styles.statCard, styles.statErrors)}>
            <span className={styles.statValue}>
              {queueStatus?.error ?? 0}
            </span>
            <span className={styles.statLabel}>Errors</span>
          </GlassPanel>
        </div>
      </section>

      {/* ── Active Batch ───────────────────────────────────────────────── */}
      {activeBatchId && (
        <section>
          <GlassPanel className={styles.batchSection}>
            <div className={styles.batchHeader}>
              <h2 className={styles.batchTitle}>Active Batch</h2>
              {batchStatus && (
                <span className={styles.batchProgress}>
                  {batchCompletedCount}/{batchStatus.total} jobs
                </span>
              )}
            </div>

            {batchStatus && (
              <div className={styles.progressRow}>
                <ProgressBar
                  value={batchProgressPercent}
                  color={batchStatus.error > 0 ? 'pink' : 'cyan'}
                />
                <div className={styles.progressLabel}>
                  <span>
                    {batchStatus.processing} processing
                    {batchStatus.pending > 0 && ` / ${batchStatus.pending} queued`}
                  </span>
                  <span>{Math.round(batchProgressPercent)}%</span>
                </div>
              </div>
            )}

            {/* Jobs table */}
            <table className={styles.jobsTable}>
              <thead>
                <tr>
                  <th>Contract Address</th>
                  <th>Status</th>
                  <th>Risk Score</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {sortedJobs.length === 0 && (
                  <tr>
                    <td colSpan={4} className={styles.emptyTable}>
                      {batchStatus ? 'No jobs in this batch yet.' : 'Loading batch data...'}
                    </td>
                  </tr>
                )}
                {sortedJobs.map((job) => (
                  <tr
                    key={job.job_id}
                    className={clsx(styles.jobRow, getJobRowClass(job.status))}
                  >
                    <td className={styles.contractAddress}>
                      {truncateAddress(job.contract_address, 6)}
                    </td>
                    <td>
                      <span className={styles.statusBadge}>
                        <span
                          className={clsx(styles.statusDot, getStatusDotClass(job.status))}
                        />
                        <Badge variant={getStatusBadgeVariant(job.status)}>
                          {job.status}
                        </Badge>
                      </span>
                    </td>
                    <td>
                      {job.risk_score !== null ? (
                        <span
                          className={clsx(styles.riskScore, getRiskClass(job.risk_score))}
                        >
                          {job.risk_score}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)' }}>--</span>
                      )}
                    </td>
                    <td>
                      {job.status === 'complete' && job.analysis_id ? (
                        <Link
                          href={`/analysis/${job.analysis_id}`}
                          className={styles.analysisLink}
                        >
                          View Analysis
                        </Link>
                      ) : job.status === 'processing' ? (
                        <Spinner size="sm" color="cyan" />
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </GlassPanel>
        </section>
      )}
    </div>
  );
}
