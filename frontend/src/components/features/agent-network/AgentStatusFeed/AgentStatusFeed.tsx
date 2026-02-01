'use client';

import React, { useEffect, useRef } from 'react';
import { GlassPanel, NeonText } from '@/components/ui';
import { useAgentStore } from '@/stores/useAgentStore';
import { AGENT_CONFIG } from '@/types/agent';
import type { AgentMessage } from '@/types/agent';
import styles from './AgentStatusFeed.module.css';

function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function MessageItem({ message }: { message: AgentMessage }) {
  const config = AGENT_CONFIG[message.agentType];

  return (
    <div className={styles.messageItem}>
      <span
        className={styles.agentDot}
        style={{ backgroundColor: config.color }}
        aria-label={config.displayName}
      />
      <div className={styles.messageBody}>
        <div className={styles.messageHeader}>
          <span className={styles.agentName}>{config.displayName}</span>
          <span className={styles.timestamp}>{formatTimestamp(message.timestamp)}</span>
        </div>
        <p className={styles.messageText}>{message.message}</p>
      </div>
    </div>
  );
}

export const AgentStatusFeed: React.FC = () => {
  const messages = useAgentStore((state) => state.messages);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages.length]);

  return (
    <GlassPanel className={styles.container}>
      <div className={styles.header}>
        <NeonText as="h3" color="cyan" className={styles.heading}>
          Agent Activity
        </NeonText>
        <span className={styles.messageCount}>
          {messages.length} {messages.length === 1 ? 'event' : 'events'}
        </span>
      </div>

      <div ref={scrollRef} className={styles.feed}>
        {messages.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.pulsingDot} />
            <span className={styles.emptyText}>
              Waiting for agents to deploy...
            </span>
          </div>
        ) : (
          messages.map((msg) => <MessageItem key={msg.id} message={msg} />)
        )}
      </div>
    </GlassPanel>
  );
};

AgentStatusFeed.displayName = 'AgentStatusFeed';
