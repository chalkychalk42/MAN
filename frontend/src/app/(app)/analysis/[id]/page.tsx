'use client';

import React, { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { GlassPanel, Badge, NeonText, Spinner, Tabs, ProgressBar } from '@/components/ui';
import type { TabItem } from '@/components/ui';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAnalysis } from '@/hooks/useAnalysis';
import { useIsAnalysisRunning } from '@/hooks/useAgentStatus';
import { useAgentStore } from '@/stores/useAgentStore';
import { AgentStatusFeed } from '@/components/features/agent-network/AgentStatusFeed';
import { OverviewTab } from '@/components/features/analysis/OverviewTab';
import { WalletTable } from '@/components/features/analysis/WalletTable';
import { InsightsPanel } from '@/components/features/analysis/InsightsPanel';
import { truncateAddress } from '@/lib/solana';
import type { AgentType, AgentStatusValue } from '@/types/agent';
import styles from './page.module.css';

/* React Flow must be loaded client-side only due to DOM dependencies */
const AgentCanvas = dynamic(
  () => import('@/components/features/agent-network/AgentCanvas').then((m) => m.AgentCanvas),
  { ssr: false },
);

const SankeyFlow = dynamic(
  () => import('@/components/features/analysis/SankeyFlow').then((m) => m.SankeyFlow),
  { ssr: false },
);

/* ------------------------------------------------------------------ */
/*  Tab definitions                                                    */
/* ------------------------------------------------------------------ */

const ANALYSIS_TABS: TabItem[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'wallets', label: 'Top Wallets' },
  { id: 'flow', label: 'Money Flow' },
  { id: 'insights', label: 'Insights' },
];

/* ------------------------------------------------------------------ */
/*  Status helpers                                                     */
/* ------------------------------------------------------------------ */

type PageView = 'loading' | 'agents' | 'results' | 'error';

function resolveView(
  analysisStatus: 'idle' | 'running' | 'complete' | 'error',
  isLoading: boolean,
  agentsRunning: boolean,
): PageView {
  if (isLoading && analysisStatus === 'idle') return 'loading';
  if (analysisStatus === 'error') return 'error';
  if (analysisStatus === 'running' || agentsRunning) return 'agents';
  if (analysisStatus === 'complete') return 'results';
  // Fallback: if we have no status yet and are still fetching
  if (isLoading) return 'loading';
  return 'results';
}

function statusBadgeVariant(status: 'idle' | 'running' | 'complete' | 'error'): 'cyan' | 'green' | 'pink' | 'yellow' {
  switch (status) {
    case 'running':
      return 'cyan';
    case 'complete':
      return 'green';
    case 'error':
      return 'pink';
    default:
      return 'yellow';
  }
}

function statusLabel(status: 'idle' | 'running' | 'complete' | 'error'): string {
  switch (status) {
    case 'running':
      return 'Analyzing';
    case 'complete':
      return 'Complete';
    case 'error':
      return 'Failed';
    default:
      return 'Queued';
  }
}

/* ------------------------------------------------------------------ */
/*  Overall Progress                                                   */
/* ------------------------------------------------------------------ */

function useOverallProgress(): number {
  const agents = useAgentStore((s) => s.agents);

  return useMemo(() => {
    const entries = Object.values(agents);
    if (entries.length === 0) return 0;
    const total = entries.reduce((sum, a) => sum + a.progress, 0);
    return Math.round(total / entries.length);
  }, [agents]);
}

/* ------------------------------------------------------------------ */
/*  Agent Summary Chips                                                */
/* ------------------------------------------------------------------ */

const STATUS_ICON: Record<AgentStatusValue, string> = {
  idle: '--',
  initializing: '...',
  working: '>>',
  complete: 'OK',
  error: '!!',
};

function AgentChips() {
  const agents = useAgentStore((s) => s.agents);

  const agentEntries = useMemo(
    () =>
      (Object.entries(agents) as [AgentType, { status: AgentStatusValue; progress: number; currentTask: string }][]),
    [agents],
  );

  return (
    <div className={styles.agentChips}>
      {agentEntries.map(([type, state]) => {
        const chipClass = [
          styles.agentChip,
          state.status === 'working' ? styles.chipWorking : '',
          state.status === 'complete' ? styles.chipComplete : '',
          state.status === 'error' ? styles.chipError : '',
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <div key={type} className={chipClass} title={state.currentTask || type}>
            <span className={styles.chipIcon}>{STATUS_ICON[state.status]}</span>
            <span className={styles.chipLabel}>{type}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page Component                                                */
/* ------------------------------------------------------------------ */

export default function AnalysisPage() {
  const params = useParams<{ id: string }>();
  const analysisId = params.id;

  const [activeTab, setActiveTab] = useState('overview');

  // Fetch existing data (handles page refresh)
  const {
    status,
    tokenData,
    flows,
    isLoading,
    fetchError,
  } = useAnalysis(analysisId);

  // Connect WebSocket for real-time updates
  const { connected } = useWebSocket(analysisId);

  // Agent-level reactive selectors
  const agentsRunning = useIsAnalysisRunning();
  const overallProgress = useOverallProgress();

  // Derive current view
  const view = resolveView(status, isLoading, agentsRunning);

  /* ── Loading ─────────────────────────────────────────────────────── */
  if (view === 'loading') {
    return (
      <div className={styles.page}>
        <div className={styles.loadingScreen}>
          <Spinner size="lg" color="cyan" />
          <NeonText color="cyan" className={styles.loadingText}>
            Loading analysis...
          </NeonText>
          <span className={styles.loadingId}>{truncateAddress(analysisId, 8)}</span>
        </div>
      </div>
    );
  }

  /* ── Error ───────────────────────────────────────────────────────── */
  if (view === 'error') {
    return (
      <div className={styles.page}>
        <PageHeader
          analysisId={analysisId}
          tokenData={tokenData}
          status={status}
          connected={connected}
        />
        <GlassPanel className={styles.errorPanel}>
          <div className={styles.errorContent}>
            <NeonText color="pink" glow className={styles.errorTitle}>
              Analysis Failed
            </NeonText>
            <p className={styles.errorMessage}>
              {fetchError?.message || 'An unexpected error occurred during analysis.'}
            </p>
            <button
              className={styles.retryButton}
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        </GlassPanel>
      </div>
    );
  }

  /* ── Agent View (running) ────────────────────────────────────────── */
  if (view === 'agents') {
    return (
      <div className={styles.page}>
        <PageHeader
          analysisId={analysisId}
          tokenData={tokenData}
          status={status}
          connected={connected}
        />

        {/* Progress bar */}
        <GlassPanel className={styles.progressSection}>
          <div className={styles.progressHeader}>
            <span className={styles.progressLabel}>Overall Progress</span>
            <span className={styles.progressValue}>{overallProgress}%</span>
          </div>
          <ProgressBar value={overallProgress} className={styles.progressBar} />
          <AgentChips />
        </GlassPanel>

        {/* Two-panel layout: Canvas + Feed */}
        <div className={styles.agentLayout}>
          <div className={styles.canvasPanel}>
            <AgentCanvas />
          </div>
          <div className={styles.feedPanel}>
            <AgentStatusFeed />
          </div>
        </div>
      </div>
    );
  }

  /* ── Results View (complete) ─────────────────────────────────────── */
  return (
    <div className={styles.page}>
      <PageHeader
        analysisId={analysisId}
        tokenData={tokenData}
        status={status}
        connected={connected}
      />

      <div className={styles.resultsSection}>
        <Tabs
          tabs={ANALYSIS_TABS}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          className={styles.tabBar}
        />

        <div className={styles.tabContent}>
          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'wallets' && <WalletTable />}
          {activeTab === 'flow' && (
            <SankeyFlow
              flowGraph={flows ?? null}
              isLoading={status === 'running'}
            />
          )}
          {activeTab === 'insights' && <InsightsPanel />}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page Header                                                        */
/* ------------------------------------------------------------------ */

interface PageHeaderProps {
  analysisId: string;
  tokenData: ReturnType<typeof useAnalysis>['tokenData'];
  status: 'idle' | 'running' | 'complete' | 'error';
  connected: boolean;
}

function PageHeader({ analysisId, tokenData, status, connected }: PageHeaderProps) {
  return (
    <GlassPanel className={styles.header}>
      <div className={styles.headerLeft}>
        {tokenData?.image_url && (
          <img
            src={tokenData.image_url}
            alt={tokenData.name}
            className={styles.tokenAvatar}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        )}
        <div className={styles.headerInfo}>
          <div className={styles.titleRow}>
            <NeonText
              as="h1"
              color="cyan"
              className={styles.tokenTitle}
            >
              {tokenData?.name || 'Analysis'}
            </NeonText>
            {tokenData?.symbol && (
              <Badge variant="purple">{tokenData.symbol}</Badge>
            )}
          </div>
          <span className={styles.analysisId}>
            ID: {truncateAddress(analysisId, 8)}
          </span>
        </div>
      </div>

      <div className={styles.headerRight}>
        <div className={styles.connectionIndicator}>
          <span
            className={`${styles.connectionDot} ${connected ? styles.connectionLive : styles.connectionOff}`}
          />
          <span className={styles.connectionLabel}>
            {connected ? 'Live' : 'Offline'}
          </span>
        </div>
        <Badge
          variant={statusBadgeVariant(status)}
          className={
            status === 'running' ? styles.badgePulse : undefined
          }
        >
          {statusLabel(status)}
        </Badge>
      </div>
    </GlassPanel>
  );
}
