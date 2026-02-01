'use client';

import React from 'react';
import styles from './RiskGauge.module.css';

interface RiskGaugeProps {
  score: number;
  size?: number;
  className?: string;
}

function getRiskColor(score: number): string {
  if (score < 30) return 'var(--color-neon-green)';
  if (score <= 60) return 'var(--color-neon-orange)';
  return 'var(--color-neon-pink)';
}

function getRiskLabel(score: number): string {
  if (score < 30) return 'Low Risk';
  if (score <= 60) return 'Medium Risk';
  return 'High Risk';
}

export const RiskGauge: React.FC<RiskGaugeProps> = ({
  score,
  size = 160,
  className,
}) => {
  const clampedScore = Math.max(0, Math.min(100, score));
  const color = getRiskColor(clampedScore);
  const label = getRiskLabel(clampedScore);
  // Map score to 0-270 degrees (semicircle arc is 270 deg for visual appeal)
  const arcDegrees = (clampedScore / 100) * 270;

  return (
    <div
      className={`${styles.gauge} ${className || ''}`}
      style={{
        width: size,
        height: size,
        '--risk-color': color,
        '--arc-degrees': `${arcDegrees}deg`,
        '--score-color': color,
      } as React.CSSProperties}
    >
      <div className={styles.track}>
        <div className={styles.fill} />
      </div>
      <div className={styles.center}>
        <span className={styles.score}>{clampedScore}</span>
        <span className={styles.label}>{label}</span>
      </div>
    </div>
  );
};

RiskGauge.displayName = 'RiskGauge';
