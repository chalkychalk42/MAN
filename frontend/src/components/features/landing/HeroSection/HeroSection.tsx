'use client';

import React from 'react';
import { motion } from 'framer-motion';
import styles from './HeroSection.module.css';

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
};

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

export const HeroSection: React.FC = () => {
  return (
    <section className={styles.hero}>
      {/* Background grid pattern */}
      <div className={styles.gridPattern} aria-hidden="true" />
      <div className={styles.radialOverlay} aria-hidden="true" />

      <motion.div
        className={styles.content}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Heading */}
        <motion.h1 className={styles.heading} variants={fadeInUp}>
          <span className={styles.headingLine}>Unleash Moltie Agents</span>
          <span className={styles.headingLine}>
            to Hunt <span className={styles.highlight}>Solana Gems</span>
          </span>
        </motion.h1>

        {/* Subheading */}
        <motion.p className={styles.subheading} variants={fadeInUp}>
          AI-powered agents collaborate in real-time to analyze Solana memecoins,
          trace money flows, and identify top copytrade wallets.
        </motion.p>

        {/* Demo Input */}
        <motion.form
          className={styles.demoForm}
          variants={fadeInUp}
          onSubmit={(e) => e.preventDefault()}
        >
          <div className={styles.inputGroup}>
            <div className={styles.inputWrapper}>
              <svg
                className={styles.inputIcon}
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
              <input
                type="text"
                placeholder="Paste Solana contract address..."
                className={styles.input}
                spellCheck={false}
              />
            </div>
            <button type="submit" className={styles.deployButton}>
              <span className={styles.deployButtonGlow} aria-hidden="true" />
              <span className={styles.deployButtonText}>Deploy Agents</span>
            </button>
          </div>
        </motion.form>

        {/* Hint */}
        <motion.p className={styles.hint} variants={fadeInUp}>
          Try it free &mdash; no wallet connection required
        </motion.p>
      </motion.div>
    </section>
  );
};

HeroSection.displayName = 'HeroSection';
