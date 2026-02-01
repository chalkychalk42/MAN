'use client';

import React from 'react';
import styles from './Footer.module.css';

export interface FooterProps {
  className?: string;
}

export const Footer: React.FC<FooterProps> = ({ className }) => {
  return (
    <footer className={`${styles.footer}${className ? ` ${className}` : ''}`}>
      <div className={styles.inner}>
        <span className={styles.built}>
          Built by{' '}
          <span className={styles.highlight}>Moltie Agent Network</span>
        </span>

        <nav className={styles.links}>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.link}
          >
            GitHub
          </a>
          <span className={styles.separator} aria-hidden="true" />
          <a
            href="/docs"
            className={styles.link}
          >
            Docs
          </a>
          <span className={styles.separator} aria-hidden="true" />
          <a
            href="https://x.com"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.link}
          >
            X
          </a>
        </nav>

        <span className={styles.powered}>
          Powered by{' '}
          <span className={styles.solana}>Solana</span>
        </span>
      </div>
    </footer>
  );
};

Footer.displayName = 'Footer';
