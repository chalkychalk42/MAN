'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button, NeonText } from '@/components/ui';
import { useAnalysisStore } from '@/stores/useAnalysisStore';
import { isValidSolanaAddress } from '@/lib/solana';
import styles from './CAInput.module.css';

export const CAInput: React.FC = () => {
  const router = useRouter();
  const [address, setAddress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const startAnalysis = useAnalysisStore((state) => state.startAnalysis);

  const handleSubmit = useCallback(async () => {
    const trimmed = address.trim();

    if (!trimmed) {
      setError('Please enter a contract address.');
      return;
    }

    if (!isValidSolanaAddress(trimmed)) {
      setError('Invalid Solana address. Please check and try again.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await startAnalysis(trimmed);
      const analysisId = useAnalysisStore.getState().currentAnalysisId;
      if (analysisId) {
        router.push(`/analysis/${analysisId}`);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to start analysis. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [address, startAnalysis, router]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !isSubmitting) {
        handleSubmit();
      }
    },
    [handleSubmit, isSubmitting]
  );

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <NeonText as="h2" color="cyan" glow className={styles.heading}>
          Analyze a Token
        </NeonText>
        <p className={styles.subtext}>
          Paste a Solana contract address to deploy the agent swarm
        </p>

        <div className={styles.inputRow}>
          <div className={styles.inputWrapper}>
            <input
              type="text"
              className={styles.input}
              placeholder="Enter Solana contract address (e.g., EPjFWdd5...)"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                if (error) setError(null);
              }}
              onKeyDown={handleKeyDown}
              disabled={isSubmitting}
              spellCheck={false}
              autoComplete="off"
            />
          </div>
          <Button
            variant="primary"
            size="lg"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={styles.submitButton}
          >
            {isSubmitting ? 'Deploying...' : 'Deploy Agents'}
          </Button>
        </div>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
};

CAInput.displayName = 'CAInput';
