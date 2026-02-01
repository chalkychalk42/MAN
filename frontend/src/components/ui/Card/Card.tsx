'use client';

import React from 'react';
import clsx from 'clsx';
import styles from './Card.module.css';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  hover = false,
}) => {
  return (
    <div
      className={clsx(styles.card, hover && styles.hoverable, className)}
    >
      {children}
    </div>
  );
};

Card.displayName = 'Card';
