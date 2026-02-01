'use client';

import React from 'react';
import { Button, GlassPanel, NeonText } from '@/components/ui';
import styles from './error.module.css';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: ErrorProps) {
  return (
    <div className={styles.errorContainer}>
      <GlassPanel className={styles.errorPanel}>
        <div className={styles.errorIcon}>!</div>
        <NeonText as="h2" color="pink" glow className={styles.errorTitle}>
          Something went wrong
        </NeonText>
        <p className={styles.errorMessage}>
          {error.message || 'An unexpected error occurred while loading the dashboard.'}
        </p>
        {error.digest && (
          <p className={styles.errorDigest}>Error ID: {error.digest}</p>
        )}
        <Button variant="primary" onClick={reset} className={styles.retryButton}>
          Try Again
        </Button>
      </GlassPanel>
    </div>
  );
}
