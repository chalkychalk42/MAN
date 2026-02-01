'use client';

import React from 'react';
import { NeonText } from '@/components/ui';
import { CAInput } from '@/components/features/dashboard/CAInput';
import { QuickStats } from '@/components/features/dashboard/QuickStats';
import { RecentScans } from '@/components/features/dashboard/RecentScans';
import styles from './page.module.css';

export default function DashboardPage() {
  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <NeonText as="h1" color="cyan" glow className={styles.title}>
          Dashboard
        </NeonText>
      </header>

      <section className={styles.inputSection}>
        <CAInput />
      </section>

      <section className={styles.statsSection}>
        <QuickStats />
      </section>

      <section className={styles.scansSection}>
        <RecentScans />
      </section>
    </div>
  );
}
