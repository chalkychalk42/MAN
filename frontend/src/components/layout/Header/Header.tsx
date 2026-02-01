'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import styles from './Header.module.css';

export interface HeaderProps {
  showSearch?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ showSearch = false }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        {/* Left: Logo */}
        <Link href="/" className={styles.logo}>
          <span className={styles.logoMark}>MAN</span>
          <span className={styles.logoText}>Moltie Agent Network</span>
        </Link>

        {/* Center: Search */}
        {showSearch && (
          <div className={styles.searchWrapper}>
            <div className={styles.searchBar}>
              <svg
                className={styles.searchIcon}
                width="16"
                height="16"
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
                placeholder="Search contract address..."
                className={styles.searchInput}
              />
            </div>
          </div>
        )}

        {/* Right: Nav + Wallet */}
        <nav className={clsx(styles.nav, mobileMenuOpen && styles.navOpen)}>
          <Link href="/dashboard" className={styles.navLink}>
            Dashboard
          </Link>
          <Link href="/history" className={styles.navLink}>
            History
          </Link>
          <button className={styles.walletButton}>
            Connect Wallet
          </button>
        </nav>

        {/* Mobile Hamburger */}
        <button
          className={clsx(styles.hamburger, mobileMenuOpen && styles.hamburgerOpen)}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <span className={styles.hamburgerLine} />
          <span className={styles.hamburgerLine} />
          <span className={styles.hamburgerLine} />
        </button>
      </div>
    </header>
  );
};

Header.displayName = 'Header';
