'use client';

import React from 'react';
import { motion } from 'framer-motion';
import styles from './FeatureGrid.module.css';

interface Feature {
  title: string;
  description: string;
  accent: string;
  icon: React.ReactNode;
}

const features: Feature[] = [
  {
    title: 'AI Agent Swarm',
    description:
      '5 specialized AI agents collaborate in real-time to analyze tokens from every angle.',
    accent: 'cyan',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a4 4 0 0 1 4 4c0 1.5-.8 2.8-2 3.5" />
        <path d="M12 2a4 4 0 0 0-4 4c0 1.5.8 2.8 2 3.5" />
        <circle cx="12" cy="12" r="3" />
        <path d="M6.5 17a4 4 0 0 1 3-1.5" />
        <path d="M17.5 17a4 4 0 0 0-3-1.5" />
        <path d="M12 15v4" />
        <circle cx="5" cy="19" r="2" />
        <circle cx="19" cy="19" r="2" />
        <circle cx="12" cy="21" r="2" />
      </svg>
    ),
  },
  {
    title: 'Money Flow Tracing',
    description:
      'Interactive Sankey diagrams reveal where funds move across the Solana ecosystem.',
    accent: 'purple',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18" />
        <path d="M7 16l4-8 4 4 5-9" />
        <path d="M16 3l5 0 0 5" />
      </svg>
    ),
  },
  {
    title: 'Wallet Scoring',
    description:
      'Composite scoring based on entry timing, PNL performance, and behavioral patterns.',
    accent: 'green',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20V10" />
        <path d="M18 20V4" />
        <path d="M6 20v-4" />
        <circle cx="12" cy="7" r="2" />
        <circle cx="18" cy="2" r="1" />
        <circle cx="6" cy="14" r="1" />
      </svg>
    ),
  },
  {
    title: 'Real-Time Visuals',
    description:
      'Watch agents work on an interactive flow map canvas with live status updates.',
    accent: 'orange',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
  {
    title: 'Historical Database',
    description:
      'Every analysis stored and searchable for pattern discovery across time.',
    accent: 'pink',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      </svg>
    ),
  },
  {
    title: 'Export Reports',
    description:
      'CSV and PDF exports for further research, sharing, and record-keeping.',
    accent: 'yellow',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    ),
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

export const FeatureGrid: React.FC = () => {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <motion.h2
          className={styles.sectionHeading}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
        >
          What Moltie Agents Can Do
        </motion.h2>

        <div className={styles.grid}>
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              className={styles.card}
              data-accent={feature.accent}
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              transition={{ delay: i * 0.1 }}
            >
              <div className={styles.cardBorder} aria-hidden="true" />
              <div className={styles.cardContent}>
                <div className={styles.iconWrapper}>
                  {feature.icon}
                </div>
                <h3 className={styles.cardTitle}>{feature.title}</h3>
                <p className={styles.cardDescription}>{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

FeatureGrid.displayName = 'FeatureGrid';
