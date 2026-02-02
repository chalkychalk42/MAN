'use client';

import React, { useState, useEffect, useRef } from 'react';
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

function getFactorSeverity(factor: string): 'high' | 'medium' | 'low' {
  const lower = factor.toLowerCase();
  if (lower.includes('rug') || lower.includes('scam') || lower.includes('honeypot') || lower.includes('malicious')) return 'high';
  if (lower.includes('whale') || lower.includes('insider') || lower.includes('concentrated') || lower.includes('suspicious')) return 'medium';
  return 'low';
}

function getSeverityColor(severity: 'high' | 'medium' | 'low'): 'pink' | 'orange' | 'cyan' {
  switch (severity) {
    case 'high': return 'pink';
    case 'medium': return 'orange';
    case 'low': return 'cyan';
  }
}

function getSeverityLabel(severity: 'high' | 'medium' | 'low'): string {
  switch (severity) {
    case 'high': return 'HIGH';
    case 'medium': return 'MED';
    case 'low': return 'LOW';
  }
}

/** Parse insight text into structured elements (paragraphs and bullet lists) */
function parseInsightText(text: string): React.ReactNode[] {
  const lines = text.split('\n').filter((line) => line.trim().length > 0);
  const elements: React.ReactNode[] = [];
  let bulletBuffer: string[] = [];

  const flushBullets = () => {
    if (bulletBuffer.length > 0) {
      elements.push(
        <ul key={`bullets-${elements.length}`} className={styles.bulletList}>
          {bulletBuffer.map((item, j) => (
            <li key={j} className={styles.bulletItem}>
              {item}
            </li>
          ))}
        </ul>
      );
      bulletBuffer = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    // Detect bullet points: lines starting with - or *
    if (/^[-*]\s+/.test(trimmed)) {
      bulletBuffer.push(trimmed.replace(/^[-*]\s+/, ''));
    } else {
      flushBullets();
      elements.push(
        <p key={`p-${elements.length}`} className={styles.paragraph}>
          {trimmed}
        </p>
      );
    }
  }

  flushBullets();
  return elements;
}

/** Typewriter hook: reveals text character by character */
function useTypewriter(text: string | null, speed: number = 12): string {
  const [displayed, setDisplayed] = useState('');
  const prevText = useRef<string | null>(null);

  useEffect(() => {
    if (!text) {
      setDisplayed('');
      prevText.current = null;
      return;
    }

    // If the text is the same, don't re-animate
    if (text === prevText.current) return;

    prevText.current = text;
    setDisplayed('');
    let index = 0;

    const interval = setInterval(() => {
      index++;
      setDisplayed(text.slice(0, index));
      if (index >= text.length) {
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  return displayed;
}

export const InsightsPanel: React.FC = () => {
  const insights = useAnalysisStore((state) => state.insights);
  const riskScore = useAnalysisStore((state) => state.riskScore);
  const riskFactors = useAnalysisStore((state) => state.riskFactors);
  const status = useAnalysisStore((state) => state.status);

  const isLoading = status === 'running' && insights === null;
  const displayedText = useTypewriter(insights);
  const isTyping = insights !== null && displayedText.length < insights.length;

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
          <ul className={styles.factorsList}>
            {riskFactors.map((factor, i) => {
              const severity = getFactorSeverity(factor);
              return (
                <li key={i} className={styles.factorItem}>
                  <span className={`${styles.factorDot} ${styles[`dot${severity.charAt(0).toUpperCase()}${severity.slice(1)}`]}`} />
                  <span className={styles.factorText}>{factor}</span>
                  <Badge variant={getSeverityColor(severity)} className={styles.factorBadge}>
                    {getSeverityLabel(severity)}
                  </Badge>
                </li>
              );
            })}
          </ul>
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
            {parseInsightText(displayedText)}
            {isTyping && <span className={styles.cursor} />}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <span className={styles.emptyText}>
              No insights available yet. Run an analysis to generate AI-powered insights.
            </span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <span className={styles.footerText}>Powered by AI</span>
        <span className={styles.footerDot} />
        <span className={styles.footerText}>Sentinel Agent</span>
      </div>
    </GlassPanel>
  );
};

InsightsPanel.displayName = 'InsightsPanel';
