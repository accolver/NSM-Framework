/**
 * PerformancePanel Component
 *
 * Real-time application performance monitoring
 */

import React from 'react';
import type { PerformancePanelProps } from '../types';
import { ErrorBoundary } from '../ErrorBoundary';

export const PerformancePanel: React.FC<PerformancePanelProps> = ({
  performanceMetrics,
  className = ''
}) => {
  return (
    <ErrorBoundary toolName="Performance Monitor">
      <div className={`performance-panel ${className}`}>
        <h3>Performance Monitor</h3>
        <p>Real-time application performance metrics</p>

        <div className="metrics-grid">
          <div className="metric-card">
            <h4>Memory Usage</h4>
            <div className="metric-value" data-testid="memory-usage">
              {performanceMetrics.memoryUsage} MB
            </div>
          </div>

          <div className="metric-card">
            <h4>Event Processing</h4>
            <div className="metric-value">
              {performanceMetrics.eventCount} events
            </div>
          </div>

          <div className="metric-card">
            <h4>Network Activity</h4>
            <div className="metric-value">
              {performanceMetrics.networkActivity}%
            </div>
          </div>
        </div>

        <div className="metrics-chart">
          <p>Performance metrics updated: {new Date(performanceMetrics.lastUpdated).toLocaleTimeString()}</p>
        </div>
      </div>
    </ErrorBoundary>
  );
};