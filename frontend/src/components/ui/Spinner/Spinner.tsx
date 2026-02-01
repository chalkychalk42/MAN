'use client';

import React from 'react';
import clsx from 'clsx';
import styles from './Spinner.module.css';

type SpinnerSize = 'sm' | 'md' | 'lg';
type SpinnerColor = 'cyan' | 'green' | 'purple' | 'orange' | 'pink';

export interface SpinnerProps {
  size?: SpinnerSize;
  color?: SpinnerColor;
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  color = 'cyan',
  className,
}) => {
  return (
    <div
      className={clsx(styles.spinner, styles[size], styles[color], className)}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only" style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', borderWidth: 0 }}>
        Loading...
      </span>
    </div>
  );
};

Spinner.displayName = 'Spinner';
