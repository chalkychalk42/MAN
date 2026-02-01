'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { Tabs } from '@/components/ui';
import type { TabItem } from '@/components/ui';
import { useWebSocket } from '@/hooks/useWebSocket';
import { AgentStatusFeed } from '@/components/features/agent-network/AgentStatusFeed';
import { OverviewTab } from '@/components/features/analysis/OverviewTab';
import { WalletTable } from '@/components/features/analysis/WalletTable';
import { InsightsPanel } from '@/components/features/analysis/InsightsPanel';
import styles from './page.module.css';

const ANALYSIS_TABS: TabItem[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'wallets', label: 'Top Wallets' },
  { id: 'flow', label: 'Money Flow' },
  { id: 'insights', label: 'Insights' },
];

export default function AnalysisPage() {
  const params = useParams<{ id: string }>();
  const analysisId = params.id;
  const [activeTab, setActiveTab] = useState('overview');

  // Connect WebSocket for real-time updates
  useWebSocket(analysisId);

  return (
    <div className={styles.analysisPage}>
      {/* Two-panel layout */}
      <div className={styles.panelLayout}>
        {/* Left panel: Agent Canvas */}
        <div className={styles.canvasPanel}>
          <div className={styles.canvasPlaceholder}>
            <div className={styles.canvasInner}>
              <svg
                className={styles.canvasIcon}
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <circle cx="12" cy="12" r="3" />
                <circle cx="4" cy="6" r="2" />
                <circle cx="20" cy="6" r="2" />
                <circle cx="4" cy="18" r="2" />
                <circle cx="20" cy="18" r="2" />
                <line x1="6" y1="6" x2="9.5" y2="10" />
                <line x1="18" y1="6" x2="14.5" y2="10" />
                <line x1="6" y1="18" x2="9.5" y2="14" />
                <line x1="18" y1="18" x2="14.5" y2="14" />
              </svg>
              <span className={styles.canvasTitle}>Agent Network Canvas</span>
              <span className={styles.canvasSubtext}>
                Real-time visualization of agent activity
              </span>
            </div>
          </div>
        </div>

        {/* Right panel: Agent Status Feed */}
        <div className={styles.feedPanel}>
          <AgentStatusFeed />
        </div>
      </div>

      {/* Tabs section */}
      <div className={styles.tabsSection}>
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
            <div className={styles.flowPlaceholder}>
              <div className={styles.flowInner}>
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M2 12h4l3-9 4 18 3-9h6" />
                </svg>
                <span className={styles.flowTitle}>Sankey Flow Diagram</span>
                <span className={styles.flowSubtext}>
                  Money flow visualization will render here
                </span>
              </div>
            </div>
          )}
          {activeTab === 'insights' && <InsightsPanel />}
        </div>
      </div>
    </div>
  );
}
