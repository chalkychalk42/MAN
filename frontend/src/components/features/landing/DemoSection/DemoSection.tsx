'use client';

import React from 'react';
import { motion } from 'framer-motion';
import styles from './DemoSection.module.css';

interface Agent {
  id: string;
  name: string;
  colorVar: string;
  cx: number;
  cy: number;
}

const agents: Agent[] = [
  { id: 'orchestrator', name: 'Orchestrator', colorVar: '--color-yellow',   cx: 300, cy: 80  },
  { id: 'scout',        name: 'Scout',        colorVar: '--color-cyan',     cx: 120, cy: 200 },
  { id: 'tracker',      name: 'Tracker',      colorVar: '--color-purple',   cx: 480, cy: 200 },
  { id: 'analyst',      name: 'Analyst',      colorVar: '--color-green',    cx: 120, cy: 340 },
  { id: 'sleuth',       name: 'Sleuth',       colorVar: '--color-orange',   cx: 480, cy: 340 },
  { id: 'sentinel',     name: 'Sentinel',     colorVar: '--color-pink',     cx: 300, cy: 440 },
];

/* Connections between agents (from -> to) */
const connections: [number, number][] = [
  [0, 1], // Orchestrator -> Scout
  [0, 2], // Orchestrator -> Tracker
  [1, 3], // Scout -> Analyst
  [2, 4], // Tracker -> Sleuth
  [3, 5], // Analyst -> Sentinel
  [4, 5], // Sleuth -> Sentinel
  [1, 2], // Scout -> Tracker
  [3, 4], // Analyst -> Sleuth
];

export const DemoSection: React.FC = () => {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <motion.h2
          className={styles.heading}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
        >
          See Agents in Action
        </motion.h2>

        <motion.div
          className={styles.demoPanel}
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <div className={styles.canvasWrapper}>
            <svg
              className={styles.canvas}
              viewBox="0 0 600 520"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Defs for glow filters */}
              <defs>
                {agents.map((agent) => (
                  <filter key={`glow-${agent.id}`} id={`glow-${agent.id}`}>
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                ))}
              </defs>

              {/* Connection lines */}
              {connections.map(([fromIdx, toIdx], i) => {
                const from = agents[fromIdx];
                const to = agents[toIdx];
                return (
                  <line
                    key={`line-${i}`}
                    className={styles.connectionLine}
                    x1={from.cx}
                    y1={from.cy}
                    x2={to.cx}
                    y2={to.cy}
                    style={{
                      animationDelay: `${i * 0.4}s`,
                    }}
                  />
                );
              })}

              {/* Data flow particles along connections */}
              {connections.map(([fromIdx, toIdx], i) => {
                const from = agents[fromIdx];
                const to = agents[toIdx];
                return (
                  <circle
                    key={`particle-${i}`}
                    className={styles.particle}
                    r="3"
                    style={{
                      animationDelay: `${i * 0.6}s`,
                      offsetPath: `path("M ${from.cx} ${from.cy} L ${to.cx} ${to.cy}")`,
                    }}
                  />
                );
              })}

              {/* Agent nodes */}
              {agents.map((agent, i) => (
                <g key={agent.id} className={styles.agentNode}>
                  {/* Pulse ring */}
                  <circle
                    className={styles.pulseRing}
                    cx={agent.cx}
                    cy={agent.cy}
                    r="34"
                    style={{
                      stroke: `var(${agent.colorVar})`,
                      animationDelay: `${i * 0.5}s`,
                    }}
                  />
                  {/* Main circle */}
                  <circle
                    className={styles.agentCircle}
                    cx={agent.cx}
                    cy={agent.cy}
                    r="28"
                    style={{
                      stroke: `var(${agent.colorVar})`,
                      fill: `var(${agent.colorVar}-dim, rgba(0,0,0,0.3))`,
                    }}
                    filter={`url(#glow-${agent.id})`}
                  />
                  {/* Label */}
                  <text
                    className={styles.agentLabel}
                    x={agent.cx}
                    y={agent.cy + 1}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{ fill: `var(${agent.colorVar})` }}
                  >
                    {agent.name.slice(0, 3).toUpperCase()}
                  </text>
                  {/* Name below */}
                  <text
                    className={styles.agentName}
                    x={agent.cx}
                    y={agent.cy + 48}
                    textAnchor="middle"
                  >
                    {agent.name}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </motion.div>

        <motion.p
          className={styles.tagline}
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          Deploy your first scan in seconds
        </motion.p>
      </div>
    </section>
  );
};

DemoSection.displayName = 'DemoSection';
