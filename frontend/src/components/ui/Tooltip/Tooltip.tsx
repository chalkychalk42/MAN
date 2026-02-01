'use client';

import React from 'react';
import clsx from 'clsx';
import styles from './Tooltip.module.css';

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

export interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: TooltipPosition;
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  className,
}) => {
  return (
    <div className={clsx(styles.wrapper, className)}>
      {children}
      <div className={clsx(styles.tooltip, styles[position])} role="tooltip">
        {content}
        <div className={styles.arrow} />
      </div>
    </div>
  );
};

Tooltip.displayName = 'Tooltip';
