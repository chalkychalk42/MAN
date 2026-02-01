'use client';

import React from 'react';
import { GlassPanel, Badge, NeonText, Spinner } from '@/components/ui';
import { useAnalysisStore } from '@/stores/useAnalysisStore';
import styles from './InsightsPanel.module.css';

function getRiskColor(score: number): 'green' | 'orange' | 'pink' {
  if (score < 30) return 'green';
  if (score <= 60) return 'orange';
  return 'pink';
}

function getRiskLabel(score: number): string {
  if (score < 30) return 'Low Risk';
  if (score <= 60) return 'Medium Risk';
  return 'High Risk';
}

function getFactorVariant(factor: string): 'cyan' | 'green' | 'purple' | 'orange' | 'pink' | 'yellow' {
  const lower = factor.toLowerCase();
  if (lower.includes('rug') || lower.includes('scam') || lower.includes('honeypot')) return 'pink';
  if (lower.includes('whale') || lower.includes('insider')) return 'orange';
  if (lower.includes('liquidity') || lower.includes('lock')) return 'purple';
  if (lower.includes('safe') || lower.includes('verified')) return 'green';
  return 'cyan';
}

export const InsightsPanel: React.FC = () => {
  const insights = useAnalysisStore((state) => state.insights);
  const riskScore = useAnalysisStore((state) => state.riskScore);
  const riskFactors = useAnalysisStore((state) => state.riskFactors);
  const status = useAnalysisStore((state) => state.status);

  const isLoading = status === 'running' && insights === null;

  return (
    <GlassPanel className={styles.container}>
      <div className={styles.header}>
        <NeonText as="h3" color="purple" className={styles.heading}>
          AI Insights
        </NeonText>
      </div>

      {/* Risk Score Display */}
      {riskScore != null ? (
        <div className={styles.riskSection}>
          <div className={styles.riskScoreDisplay}>
            <NeonText
              color={getRiskColor(riskScore)}
              glow
              className={styles.riskNumber}
            >
              {riskScore}
            </NeonText>
            <span className={styles.riskLabel}>{getRiskLabel(riskScore)}</span>
          </div>
        </div>
      ) : (
        <div className={styles.riskSection}>
          <span className={styles.riskPending}>--</span>
        </div>
      )}

      {/* Risk Factors */}
      {riskFactors.length > 0 && (
        <div className={styles.factorsSection}>
          <span className={styles.sectionLabel}>Risk Factors</span>
          <div className={styles.factorsList}>
            {riskFactors.map((factor, i) => (
              <Badge key={i} variant={getFactorVariant(factor)}>
                {factor}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* AI Insights Text */}
      <div className={styles.insightsSection}>
        {isLoading ? (
          <div className={styles.loadingState}>
            <Spinner size="sm" />
            <span className={styles.loadingText}>
              Sentinel agent generating insights...
            </span>
          </div>
        ) : insights ? (
          <div className={styles.insightsText}>
            {insights.split('\n').map((paragraph, i) => (
              <p key={i} className={styles.paragraph}>
                {paragraph}
              </p>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <span className={styles.emptyText}>
              No insights available yet.
            </span>
          </div>
        )}
      </div>
    </GlassPanel>
  );
};

InsightsPanel.displayName = 'InsightsPanel';
