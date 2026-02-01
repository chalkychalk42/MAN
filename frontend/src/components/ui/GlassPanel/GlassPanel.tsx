'use client';

import React from 'react';
import clsx from 'clsx';
import styles from './GlassPanel.module.css';

type GlassPanelVariant = 'default' | 'accent' | 'compact';

export interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
  variant?: GlassPanelVariant;
}

export const GlassPanel: React.FC<GlassPanelProps> = ({
  children,
  className,
  variant = 'default',
}) => {
  return (
    <div className={clsx(styles.panel, styles[variant], className)}>
      {children}
    </div>
  );
};

GlassPanel.displayName = 'GlassPanel';
