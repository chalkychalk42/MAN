'use client';

import React from 'react';
import { Button, GlassPanel, NeonText } from '@/components/ui';
import styles from './error.module.css';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function WalletError({ error, reset }: ErrorProps) {
  return (
    <div className={styles.errorContainer}>
      <GlassPanel className={styles.errorPanel}>
        <div className={styles.errorIcon}>!</div>
        <NeonText as="h2" color="pink" glow className={styles.errorTitle}>
          Wallet Not Found
        </NeonText>
        <p className={styles.errorMessage}>
          {error.message || 'Could not load wallet data. The address may be invalid.'}
        </p>
        {error.digest && (
          <p className={styles.errorDigest}>Error ID: {error.digest}</p>
        )}
        <div className={styles.actions}>
          <Button variant="primary" onClick={reset}>
            Retry
          </Button>
          <Button variant="ghost" as="a" href="/dashboard">
            Back to Dashboard
          </Button>
        </div>
      </GlassPanel>
    </div>
  );
}
