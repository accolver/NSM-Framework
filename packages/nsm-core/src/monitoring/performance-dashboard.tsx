/**
 * Performance Dashboard Component
 * Real-time performance monitoring dashboard for NSM applications
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  usePerformanceMonitoring,
  useCoreWebVitals,
  usePerformanceAlerts,
  useCustomMetrics
} from './react-performance-hooks';
import type { PerformanceMetrics, PerformanceAlert } from './performance-monitor';

interface PerformanceDashboardProps {
  title?: string;
  refreshInterval?: number;
  showAlerts?: boolean;
  showMetrics?: boolean;
  showChart?: boolean;
  compact?: boolean;
  className?: string;
  onAlert?: (alert: PerformanceAlert) => void;
}

const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  title = 'Performance Monitor',
  refreshInterval = 1000,
  showAlerts = true,
  showMetrics = true,
  showChart = false,
  compact = false,
  className = '',
  onAlert
}) => {
  const {
    isMonitoring,
    currentMetrics,
    alerts,
    startMonitoring,
    stopMonitoring,
    getReport,
    clearAlerts
  } = usePerformanceMonitoring();

  const { webVitals, getVitalsStatus } = useCoreWebVitals();
  const { alerts: allAlerts, alertCount, acknowledgeAlert } = usePerformanceAlerts();
  const [metricsHistory, setMetricsHistory] = useState<PerformanceMetrics[]>([]);

  // Update metrics history
  useEffect(() => {
    if (currentMetrics) {
      setMetricsHistory(prev => {
        const newHistory = [...prev, currentMetrics];
        return newHistory.slice(-50); // Keep last 50 data points
      });
    }
  }, [currentMetrics]);

  // Handle alerts
  useEffect(() => {
    if (alerts.length > 0 && onAlert) {
      alerts.forEach(alert => onAlert(alert));
    }
  }, [alerts, onAlert]);

  const vitalsStatus = useMemo(() => getVitalsStatus(), [getVitalsStatus]);

  const formatValue = (value: number, unit: string = 'ms'): string => {
    if (value === 0) return '0' + unit;
    if (value < 1) return (value * 1000).toFixed(0) + 'μs';
    if (value < 1000) return value.toFixed(1) + unit;
    return (value / 1000).toFixed(2) + 's';
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status: 'good' | 'needs-improvement' | 'poor'): string => {
    switch (status) {
      case 'good': return '#10b981'; // green
      case 'needs-improvement': return '#f59e0b'; // yellow
      case 'poor': return '#ef4444'; // red
      default: return '#6b7280'; // gray
    }
  };

  const getAlertColor = (type: string): string => {
    switch (type) {
      case 'critical': return '#ef4444';
      case 'warning': return '#f59e0b';
      case 'info': return '#3b82f6';
      case 'recovery': return '#10b981';
      default: return '#6b7280';
    }
  };

  if (compact) {
    return (
      <div className={`performance-dashboard-compact ${className}`} style={{
        padding: '8px 12px',
        backgroundColor: '#f8f9fa',
        borderRadius: '6px',
        border: '1px solid #e9ecef',
        fontSize: '12px',
        fontFamily: 'monospace'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: isMonitoring ? '#10b981' : '#6b7280'
          }} />
          <span>LCP: {formatValue(webVitals.lcp)}</span>
          <span>FID: {formatValue(webVitals.fid)}</span>
          <span>CLS: {webVitals.cls.toFixed(3)}</span>
          {alertCount.critical > 0 && (
            <span style={{ color: '#ef4444' }}>⚠ {alertCount.critical}</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`performance-dashboard ${className}`} style={{
      padding: '16px',
      backgroundColor: '#ffffff',
      borderRadius: '8px',
      border: '1px solid #e5e7eb',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
          {title}
        </h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={isMonitoring ? stopMonitoring : startMonitoring}
            style={{
              padding: '6px 12px',
              borderRadius: '4px',
              border: '1px solid #d1d5db',
              backgroundColor: isMonitoring ? '#ef4444' : '#10b981',
              color: 'white',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            {isMonitoring ? 'Stop' : 'Start'}
          </button>
          {showAlerts && alerts.length > 0 && (
            <button
              onClick={clearAlerts}
              style={{
                padding: '6px 12px',
                borderRadius: '4px',
                border: '1px solid #d1d5db',
                backgroundColor: '#f3f4f6',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Clear Alerts
            </button>
          )}
        </div>
      </div>

      {/* Status Indicator */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '16px',
        padding: '8px 12px',
        backgroundColor: isMonitoring ? '#f0fdf4' : '#f9fafb',
        borderRadius: '6px',
        border: `1px solid ${isMonitoring ? '#bbf7d0' : '#e5e7eb'}`
      }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: isMonitoring ? '#10b981' : '#6b7280'
        }} />
        <span style={{ fontSize: '14px', fontWeight: '500' }}>
          {isMonitoring ? 'Monitoring Active' : 'Monitoring Stopped'}
        </span>
        {currentMetrics && (
          <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: 'auto' }}>
            Last update: {new Date(currentMetrics.timestamp).toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Core Web Vitals */}
      {showMetrics && (
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600' }}>
            Core Web Vitals
          </h4>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '12px'
          }}>
            {Object.entries(vitalsStatus).map(([key, data]) => (
              <div key={key} style={{
                padding: '12px',
                backgroundColor: '#f8f9fa',
                borderRadius: '6px',
                border: `2px solid ${getStatusColor(data.status)}`
              }}>
                <div style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  color: '#6b7280',
                  marginBottom: '4px'
                }}>
                  {key.toUpperCase()}
                </div>
                <div style={{
                  fontSize: '18px',
                  fontWeight: '700',
                  color: getStatusColor(data.status)
                }}>
                  {key === 'cls' ? data.value.toFixed(3) : formatValue(data.value)}
                </div>
                <div style={{
                  fontSize: '10px',
                  color: getStatusColor(data.status),
                  textTransform: 'capitalize'
                }}>
                  {data.status.replace('-', ' ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performance Metrics Grid */}
      {showMetrics && currentMetrics && (
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600' }}>
            System Metrics
          </h4>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px'
          }}>
            {/* Network Metrics */}
            <div style={{
              padding: '12px',
              backgroundColor: '#f8f9fa',
              borderRadius: '6px',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '8px' }}>
                NETWORK
              </div>
              <div style={{ fontSize: '14px' }}>
                <div>Latency: {formatValue(currentMetrics.network.latency)}</div>
                <div>Requests: {currentMetrics.network.requestCount}</div>
                <div>Failed: {currentMetrics.network.failedRequests}</div>
              </div>
            </div>

            {/* State Machine Metrics */}
            <div style={{
              padding: '12px',
              backgroundColor: '#f8f9fa',
              borderRadius: '6px',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '8px' }}>
                STATE MACHINE
              </div>
              <div style={{ fontSize: '14px' }}>
                <div>Transitions: {currentMetrics.stateMachine.totalTransitions}</div>
                <div>Avg Time: {formatValue(currentMetrics.stateMachine.averageTransitionTime)}</div>
                <div>Errors: {currentMetrics.stateMachine.errorCount}</div>
              </div>
            </div>

            {/* Memory Metrics */}
            <div style={{
              padding: '12px',
              backgroundColor: '#f8f9fa',
              borderRadius: '6px',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '8px' }}>
                MEMORY
              </div>
              <div style={{ fontSize: '14px' }}>
                <div>Used: {formatBytes(currentMetrics.memory.used)}</div>
                <div>Total: {formatBytes(currentMetrics.memory.total)}</div>
                <div>Usage: {currentMetrics.memory.percentage.toFixed(1)}%</div>
              </div>
            </div>

            {/* User Interaction Metrics */}
            <div style={{
              padding: '12px',
              backgroundColor: '#f8f9fa',
              borderRadius: '6px',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '8px' }}>
                INTERACTIONS
              </div>
              <div style={{ fontSize: '14px' }}>
                <div>Clicks: {currentMetrics.userInteraction.clickCount}</div>
                <div>Input Latency: {formatValue(currentMetrics.userInteraction.inputLatency)}</div>
                <div>Render Time: {formatValue(currentMetrics.userInteraction.componentRenderTime)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Simple Chart */}
      {showChart && metricsHistory.length > 1 && (
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600' }}>
            Performance Trend (LCP)
          </h4>
          <div style={{
            height: '60px',
            backgroundColor: '#f8f9fa',
            borderRadius: '6px',
            border: '1px solid #e5e7eb',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <svg width="100%" height="100%" style={{ position: 'absolute' }}>
              <polyline
                points={metricsHistory.map((metrics, index) => {
                  const x = (index / (metricsHistory.length - 1)) * 100;
                  const y = 100 - (Math.min(metrics.coreWebVitals.lcp, 5000) / 5000) * 100;
                  return `${x}%,${y}%`;
                }).join(' ')}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2"
              />
            </svg>
          </div>
        </div>
      )}

      {/* Alerts */}
      {showAlerts && allAlerts.length > 0 && (
        <div>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600' }}>
            Active Alerts ({allAlerts.length})
          </h4>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {allAlerts.slice(-10).map(alert => (
              <div key={alert.id} style={{
                padding: '8px 12px',
                marginBottom: '4px',
                backgroundColor: '#f8f9fa',
                borderRadius: '4px',
                borderLeft: `4px solid ${getAlertColor(alert.type)}`,
                fontSize: '12px'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontWeight: '600', color: getAlertColor(alert.type) }}>
                    {alert.type.toUpperCase()}
                  </span>
                  <button
                    onClick={() => acknowledgeAlert(alert.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '16px',
                      color: '#6b7280'
                    }}
                  >
                    ×
                  </button>
                </div>
                <div style={{ color: '#374151', marginTop: '4px' }}>
                  {alert.message}
                </div>
                <div style={{ color: '#6b7280', fontSize: '10px', marginTop: '4px' }}>
                  {new Date(alert.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceDashboard;

// Mini performance indicator component for corner display
export const PerformanceIndicator: React.FC<{
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  onClick?: () => void;
}> = ({ position = 'top-right', onClick }) => {
  const { isMonitoring, currentMetrics } = usePerformanceMonitoring();
  const { webVitals } = useCoreWebVitals();
  const { alertCount } = usePerformanceAlerts();

  const hasIssues = alertCount.critical > 0 || alertCount.warning > 0;
  const color = !isMonitoring ? '#6b7280' : hasIssues ? '#ef4444' : '#10b981';

  const positionStyles = {
    'top-left': { top: '16px', left: '16px' },
    'top-right': { top: '16px', right: '16px' },
    'bottom-left': { bottom: '16px', left: '16px' },
    'bottom-right': { bottom: '16px', right: '16px' }
  };

  return (
    <div
      onClick={onClick}
      style={{
        position: 'fixed',
        ...positionStyles[position],
        padding: '8px 12px',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '20px',
        border: `2px solid ${color}`,
        fontSize: '12px',
        fontFamily: 'monospace',
        cursor: onClick ? 'pointer' : 'default',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}
    >
      <div style={{
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        backgroundColor: color
      }} />
      <span>
        {webVitals.lcp > 0 ? `${Math.round(webVitals.lcp)}ms` : '---'}
      </span>
      {hasIssues && (
        <span style={{ color: '#ef4444' }}>
          ⚠{alertCount.critical + alertCount.warning}
        </span>
      )}
    </div>
  );
};