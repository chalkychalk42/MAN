'use client';

import React from 'react';
import clsx from 'clsx';
import styles from './Badge.module.css';

type BadgeVariant = 'cyan' | 'green' | 'purple' | 'orange' | 'pink' | 'yellow';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'cyan',
  className,
}) => {
  return (
    <span className={clsx(styles.badge, styles[variant], className)}>
      {children}
    </span>
  );
};

Badge.displayName = 'Badge';
