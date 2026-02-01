'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import styles from './CTASection.module.css';

const fadeInUp = {
  hidden: { opacity: 0, y: 25 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

export const CTASection: React.FC = () => {
  return (
    <section className={styles.section}>
      <div className={styles.gradientBg} aria-hidden="true" />

      <motion.div
        className={styles.content}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
        transition={{ staggerChildren: 0.12 }}
      >
        <motion.h2 className={styles.heading} variants={fadeInUp}>
          Ready to Hunt Solana Gems?
        </motion.h2>

        <motion.p className={styles.subtext} variants={fadeInUp}>
          Join the Moltie Agent Network and get AI-powered insights on every memecoin.
        </motion.p>

        <motion.div className={styles.actions} variants={fadeInUp}>
          <Link href="/dashboard" className={styles.primaryButton}>
            <span className={styles.buttonGlow} aria-hidden="true" />
            <span className={styles.buttonText}>Launch Dashboard</span>
          </Link>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.secondaryButton}
          >
            View on GitHub
          </a>
        </motion.div>
      </motion.div>
    </section>
  );
};

CTASection.displayName = 'CTASection';
