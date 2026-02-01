'use client';

import React from 'react';
import { Button, GlassPanel, NeonText } from '@/components/ui';
import styles from './error.module.css';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AnalysisError({ error, reset }: ErrorProps) {
  return (
    <div className={styles.errorContainer}>
      <GlassPanel className={styles.errorPanel}>
        <div className={styles.errorIcon}>!</div>
        <NeonText as="h2" color="pink" glow className={styles.errorTitle}>
          Analysis Failed
        </NeonText>
        <p className={styles.errorMessage}>
          {error.message || 'An unexpected error occurred during the analysis.'}
        </p>
        {error.digest && (
          <p className={styles.errorDigest}>Error ID: {error.digest}</p>
        )}
        <div className={styles.actions}>
          <Button variant="primary" onClick={reset}>
            Retry Analysis
          </Button>
          <Button variant="ghost" as="a" href="/dashboard">
            Back to Dashboard
          </Button>
        </div>
      </GlassPanel>
    </div>
  );
}
