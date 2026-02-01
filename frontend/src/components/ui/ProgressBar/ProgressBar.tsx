'use client';

import React from 'react';
import clsx from 'clsx';
import styles from './ProgressBar.module.css';

type ProgressColor = 'cyan' | 'green' | 'purple' | 'orange' | 'pink';

export interface ProgressBarProps {
  value: number;
  color?: ProgressColor;
  showLabel?: boolean;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  color = 'cyan',
  showLabel = false,
  className,
}) => {
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div className={clsx(styles.wrapper, className)}>
      <div
        className={clsx(styles.track, styles[color])}
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={styles.fill}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
      {showLabel && (
        <span className={styles.label}>{Math.round(clampedValue)}%</span>
      )}
    </div>
  );
};

ProgressBar.displayName = 'ProgressBar';
