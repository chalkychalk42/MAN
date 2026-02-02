'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import styles from './Sidebar.module.css';

export interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

const navItems = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: '/analysis',
    label: 'Analysis',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="4" />
        <line x1="21.17" y1="8" x2="12" y2="8" />
        <line x1="3.95" y1="6.06" x2="8.54" y2="14" />
        <line x1="10.88" y1="21.94" x2="15.46" y2="14" />
      </svg>
    ),
  },
  {
    href: '/queue',
    label: 'Queue',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" />
        <line x1="3" y1="12" x2="3.01" y2="12" />
        <line x1="3" y1="18" x2="3.01" y2="18" />
      </svg>
    ),
  },
  {
    href: '/history',
    label: 'History',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
];

const recentScans = [
  { address: '7xKX...9mPq', label: 'BONK', time: '2m ago' },
  { address: '3dFe...7kWz', label: 'WIF', time: '15m ago' },
  { address: '9pLm...4rTx', label: 'MYRO', time: '1h ago' },
];

export const Sidebar: React.FC<SidebarProps> = ({ open = false, onClose }) => {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile backdrop overlay */}
      {open && (
        <div
          className={styles.backdrop}
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={clsx(styles.sidebar, open && styles.sidebarOpen)}>
        {/* Navigation */}
        <nav className={styles.nav}>
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(styles.navItem, isActive && styles.navItemActive)}
                onClick={onClose}
              >
                <span className={styles.navIcon}>{item.icon}</span>
                <span className={styles.navLabel}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Divider */}
        <div className={styles.divider} />

        {/* Recent Scans */}
        <div className={styles.recentSection}>
          <h3 className={styles.recentHeading}>Recent Scans</h3>
          <ul className={styles.recentList}>
            {recentScans.map((scan) => (
              <li key={scan.address} className={styles.recentItem}>
                <Link href={`/analysis/${scan.address}`} className={styles.recentLink} onClick={onClose}>
                  <span className={styles.recentLabel}>{scan.label}</span>
                  <span className={styles.recentAddress}>{scan.address}</span>
                  <span className={styles.recentTime}>{scan.time}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Version */}
        <div className={styles.version}>
          <span>v0.1.0</span>
        </div>
      </aside>
    </>
  );
};

Sidebar.displayName = 'Sidebar';
