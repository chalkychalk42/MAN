'use client';

import React from 'react';
import clsx from 'clsx';
import styles from './NeonText.module.css';

type NeonColor = 'cyan' | 'green' | 'purple' | 'orange' | 'pink';
type NeonElement = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span';

const glowMap: Record<NeonColor, string> = {
  cyan: styles.glowCyan,
  green: styles.glowGreen,
  purple: styles.glowPurple,
  orange: styles.glowOrange,
  pink: styles.glowPink,
};

export interface NeonTextProps {
  children: React.ReactNode;
  color?: NeonColor;
  as?: NeonElement;
  size?: string;
  className?: string;
  glow?: boolean;
}

export const NeonText: React.FC<NeonTextProps> = ({
  children,
  color = 'cyan',
  as: Tag = 'span',
  size,
  className,
  glow = false,
}) => {
  return (
    <Tag
      className={clsx(
        styles.neonText,
        styles[color],
        glow && glowMap[color],
        className
      )}
      style={size ? { fontSize: size } : undefined}
    >
      {children}
    </Tag>
  );
};

NeonText.displayName = 'NeonText';
