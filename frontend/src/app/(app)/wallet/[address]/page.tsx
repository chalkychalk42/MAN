'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { NeonText, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import type { WalletProfile as WalletProfileType } from '@/types/wallet';
import { WalletProfile } from '@/components/features/wallet/WalletProfile';
import { PNLChart } from '@/components/features/wallet/PNLChart';
import { ConnectionGraph } from '@/components/features/wallet/ConnectionGraph';
import { TransactionHistory } from '@/components/features/wallet/TransactionHistory';
import styles from './page.module.css';

export default function WalletPage() {
  const params = useParams<{ address: string }>();
  const address = params.address;
  const [wallet, setWallet] = useState<WalletProfileType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchWallet() {
      setLoading(true);
      setError(null);
      try {
        const data = await api.getWallet(address);
        if (!cancelled) {
          setWallet(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to load wallet data.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchWallet();
    return () => {
      cancelled = true;
    };
  }, [address]);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner size="lg" />
        <span className={styles.loadingText}>Loading wallet data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <NeonText as="h2" color="pink" glow>
          Error loading wallet
        </NeonText>
        <p className={styles.errorMessage}>{error}</p>
      </div>
    );
  }

  return (
    <div className={styles.walletPage}>
      {/* Wallet Profile Header */}
      <section className={styles.profileSection}>
        <WalletProfile wallet={wallet} address={address} />
      </section>

      {/* Charts Grid */}
      <section className={styles.chartsGrid}>
        <PNLChart address={address} />
        <ConnectionGraph address={address} />
      </section>

      {/* Transaction History */}
      <section className={styles.historySection}>
        <TransactionHistory address={address} />
      </section>
    </div>
  );
}
