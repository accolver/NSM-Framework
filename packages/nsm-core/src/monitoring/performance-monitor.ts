/**
 * NSM Performance Monitoring System
 * Comprehensive performance tracking for state machines, network, and user interactions
 */

import { EventEmitter } from 'events';

// Core Web Vitals and Performance Metrics
export interface CoreWebVitals {
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  ttfb: number; // Time to First Byte
  fcp: number; // First Contentful Paint
}

export interface StateMachineMetrics {
  transitionTime: number;
  stateChangeCount: number;
  averageTransitionTime: number;
  slowestTransition: {
    from: string;
    to: string;
    duration: number;
    timestamp: number;
  };
  totalTransitions: number;
  errorCount: number;
}

export interface NetworkMetrics {
  latency: number;
  requestCount: number;
  failedRequests: number;
  averageResponseTime: number;
  slowestRequest: {
    url: string;
    duration: number;
    timestamp: number;
  };
  throughput: number;
  connectionCount: number;
}

export interface UserInteractionMetrics {
  clickCount: number;
  inputLatency: number;
  scrollPerformance: number;
  pageLoadTime: number;
  routeChangeTime: number;
  componentRenderTime: number;
  interactionToNextPaint: number;
}

export interface PerformanceMetrics {
  timestamp: number;
  coreWebVitals: CoreWebVitals;
  stateMachine: StateMachineMetrics;
  network: NetworkMetrics;
  userInteraction: UserInteractionMetrics;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
    loadAverage: number[];
  };
}

export interface PerformanceThresholds {
  coreWebVitals: {
    lcp: { warning: number; critical: number };
    fid: { warning: number; critical: number };
    cls: { warning: number; critical: number };
  };
  stateMachine: {
    transitionTime: { warning: number; critical: number };
    errorRate: { warning: number; critical: number };
  };
  network: {
    latency: { warning: number; critical: number };
    errorRate: { warning: number; critical: number };
  };
  userInteraction: {
    inputLatency: { warning: number; critical: number };
    renderTime: { warning: number; critical: number };
  };
}

export interface PerformanceAlert {
  id: string;
  type: 'warning' | 'critical' | 'info' | 'recovery';
  metric: string;
  value: number;
  threshold: number;
  message: string;
  timestamp: number;
  resolved?: boolean;
  resolvedAt?: number;
}

export interface PerformanceConfig {
  enabled: boolean;
  samplingRate: number; // 0-1, percentage of events to track
  maxHistorySize: number;
  thresholds: PerformanceThresholds;
  enableCoreWebVitals: boolean;
  enableStateMachineTracking: boolean;
  enableNetworkTracking: boolean;
  enableUserInteractionTracking: boolean;
  alertCooldownMs: number;
}

const DEFAULT_CONFIG: PerformanceConfig = {
  enabled: true,
  samplingRate: 1.0,
  maxHistorySize: 1000,
  thresholds: {
    coreWebVitals: {
      lcp: { warning: 2500, critical: 4000 },
      fid: { warning: 100, critical: 300 },
      cls: { warning: 0.1, critical: 0.25 }
    },
    stateMachine: {
      transitionTime: { warning: 100, critical: 500 },
      errorRate: { warning: 0.01, critical: 0.05 }
    },
    network: {
      latency: { warning: 1000, critical: 3000 },
      errorRate: { warning: 0.02, critical: 0.1 }
    },
    userInteraction: {
      inputLatency: { warning: 50, critical: 100 },
      renderTime: { warning: 16, critical: 32 }
    }
  },
  enableCoreWebVitals: true,
  enableStateMachineTracking: true,
  enableNetworkTracking: true,
  enableUserInteractionTracking: true,
  alertCooldownMs: 60000 // 1 minute
};

export class PerformanceMonitor extends EventEmitter {
  private config: PerformanceConfig;
  private metrics: PerformanceMetrics[] = [];
  private alerts: PerformanceAlert[] = [];
  private activeAlerts = new Map<string, PerformanceAlert>();
  private observers: PerformanceObserver[] = [];
  private isMonitoring = false;
  private collectInterval?: NodeJS.Timeout;
  private startTime = Date.now();

  // Current metrics tracking
  private currentMetrics: Partial<PerformanceMetrics> = {};
  private stateMachineStats = {
    transitionTimes: [] as number[],
    transitionCount: 0,
    errorCount: 0,
    slowestTransition: null as any
  };
  private networkStats = {
    requestTimes: [] as number[],
    requestCount: 0,
    failedRequests: 0,
    slowestRequest: null as any
  };
  private userInteractionStats = {
    clickCount: 0,
    inputLatencies: [] as number[],
    renderTimes: [] as number[]
  };

  constructor(config: Partial<PerformanceConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.setupPerformanceObservers();
  }

  private setupPerformanceObservers(): void {
    if (typeof window === 'undefined') return;

    // Core Web Vitals Observer
    if (this.config.enableCoreWebVitals) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.handlePerformanceEntry(entry);
          }
        });

        observer.observe({
          entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift', 'navigation', 'paint']
        });
        this.observers.push(observer);
      } catch (error) {
        console.warn('Failed to setup Core Web Vitals observer:', error);
      }
    }

    // User Interaction Observer
    if (this.config.enableUserInteractionTracking) {
      this.setupUserInteractionTracking();
    }

    // Network Request Observer
    if (this.config.enableNetworkTracking) {
      this.setupNetworkTracking();
    }
  }

  private handlePerformanceEntry(entry: PerformanceEntry): void {
    if (!this.shouldSample()) return;

    switch (entry.entryType) {
      case 'largest-contentful-paint':
        this.updateMetric('coreWebVitals.lcp', entry.startTime);
        break;
      case 'first-input':
        const fidEntry = entry as any;
        this.updateMetric('coreWebVitals.fid', fidEntry.processingStart - fidEntry.startTime);
        break;
      case 'layout-shift':
        const clsEntry = entry as any;
        if (!clsEntry.hadRecentInput) {
          const currentCls = this.currentMetrics.coreWebVitals?.cls || 0;
          this.updateMetric('coreWebVitals.cls', currentCls + clsEntry.value);
        }
        break;
      case 'navigation':
        const navEntry = entry as PerformanceNavigationTiming;
        this.updateMetric('coreWebVitals.ttfb', navEntry.responseStart - navEntry.requestStart);
        this.updateMetric('userInteraction.pageLoadTime', navEntry.loadEventEnd - navEntry.loadEventStart);
        break;
      case 'paint':
        if (entry.name === 'first-contentful-paint') {
          this.updateMetric('coreWebVitals.fcp', entry.startTime);
        }
        break;
    }
  }

  private setupUserInteractionTracking(): void {
    if (typeof window === 'undefined') return;

    // Click tracking
    window.addEventListener('click', (event) => {
      this.userInteractionStats.clickCount++;
      const startTime = performance.now();

      // Measure click response time using requestAnimationFrame
      requestAnimationFrame(() => {
        const responseTime = performance.now() - startTime;
        this.userInteractionStats.inputLatencies.push(responseTime);
        this.updateMetric('userInteraction.inputLatency', this.getAverage(this.userInteractionStats.inputLatencies));
      });
    });

    // Input latency tracking
    ['input', 'keydown', 'touchstart'].forEach(eventType => {
      window.addEventListener(eventType, (event) => {
        const startTime = performance.now();
        requestAnimationFrame(() => {
          const latency = performance.now() - startTime;
          this.userInteractionStats.inputLatencies.push(latency);
          this.updateMetric('userInteraction.inputLatency', this.getAverage(this.userInteractionStats.inputLatencies));
        });
      });
    });

    // Scroll performance tracking
    let lastScrollTime = 0;
    window.addEventListener('scroll', () => {
      const now = performance.now();
      if (lastScrollTime > 0) {
        const scrollPerf = now - lastScrollTime;
        this.updateMetric('userInteraction.scrollPerformance', scrollPerf);
      }
      lastScrollTime = now;
    });
  }

  private setupNetworkTracking(): void {
    if (typeof window === 'undefined') return;

    // Override fetch to track network requests
    const originalFetch = window.fetch;
    (window.fetch as any) = async (...args: Parameters<typeof fetch>) => {
      const startTime = performance.now();
      this.networkStats.requestCount++;

      try {
        const response = await originalFetch(...args);
        const duration = performance.now() - startTime;
        this.networkStats.requestTimes.push(duration);

        // Track slowest request
        if (!this.networkStats.slowestRequest || duration > this.networkStats.slowestRequest.duration) {
          this.networkStats.slowestRequest = {
            url: args[0].toString(),
            duration,
            timestamp: Date.now()
          };
        }

        this.updateNetworkMetrics();
        return response;
      } catch (error) {
        this.networkStats.failedRequests++;
        this.updateNetworkMetrics();
        throw error;
      }
    };
  }

  private updateNetworkMetrics(): void {
    const avgResponseTime = this.getAverage(this.networkStats.requestTimes);
    this.updateMetric('network.latency', avgResponseTime);
    this.updateMetric('network.averageResponseTime', avgResponseTime);
    this.updateMetric('network.requestCount', this.networkStats.requestCount);
    this.updateMetric('network.failedRequests', this.networkStats.failedRequests);

    if (this.networkStats.slowestRequest) {
      this.updateMetric('network.slowestRequest', this.networkStats.slowestRequest);
    }
  }

  private shouldSample(): boolean {
    return Math.random() < this.config.samplingRate;
  }

  private updateMetric(path: string, value: any): void {
    const keys = path.split('.');
    let current = this.currentMetrics as any;

    // Navigate to the correct nested object
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (key && !current[key]) {
        current[key] = {};
      }
      if (key) {
        current = current[key];
      }
    }

    // Set the value
    const finalKey = keys[keys.length - 1];
    if (finalKey) {
      current[finalKey] = value;
    }

    // Check for threshold violations
    this.checkThresholds(path, value);
  }

  private getAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private checkThresholds(metricPath: string, value: number): void {
    const thresholds = this.getThresholdForMetric(metricPath);
    if (!thresholds) return;

    const alertKey = `${metricPath}`;
    const existingAlert = this.activeAlerts.get(alertKey);

    if (value >= thresholds.critical) {
      if (!existingAlert || existingAlert.type !== 'critical') {
        this.createAlert(alertKey, 'critical', metricPath, value, thresholds.critical);
      }
    } else if (value >= thresholds.warning) {
      if (!existingAlert || existingAlert.type !== 'warning') {
        this.createAlert(alertKey, 'warning', metricPath, value, thresholds.warning);
      }
    } else if (existingAlert) {
      // Value is now within acceptable range - create recovery alert
      this.createAlert(alertKey, 'recovery', metricPath, value, thresholds.warning);
      this.resolveAlert(alertKey);
    }
  }

  private getThresholdForMetric(metricPath: string): { warning: number; critical: number } | null {
    const { thresholds } = this.config;

    if (metricPath.startsWith('coreWebVitals.')) {
      const metric = metricPath.split('.')[1] as keyof typeof thresholds.coreWebVitals;
      return thresholds.coreWebVitals[metric] || null;
    }

    if (metricPath.startsWith('stateMachine.')) {
      const metric = metricPath.split('.')[1] as keyof typeof thresholds.stateMachine;
      return thresholds.stateMachine[metric] || null;
    }

    if (metricPath.startsWith('network.')) {
      const metric = metricPath.split('.')[1] as keyof typeof thresholds.network;
      return thresholds.network[metric] || null;
    }

    if (metricPath.startsWith('userInteraction.')) {
      const metric = metricPath.split('.')[1] as keyof typeof thresholds.userInteraction;
      return thresholds.userInteraction[metric] || null;
    }

    return null;
  }

  private createAlert(
    key: string,
    type: PerformanceAlert['type'],
    metric: string,
    value: number,
    threshold: number
  ): void {
    const alert: PerformanceAlert = {
      id: `${key}-${Date.now()}`,
      type,
      metric,
      value,
      threshold,
      message: this.getAlertMessage(type, metric, value, threshold),
      timestamp: Date.now()
    };

    this.alerts.push(alert);
    this.activeAlerts.set(key, alert);
    this.emit('alert', alert);

    // Trim alerts array if it gets too large
    if (this.alerts.length > this.config.maxHistorySize) {
      this.alerts = this.alerts.slice(-this.config.maxHistorySize);
    }
  }

  private resolveAlert(key: string): void {
    const alert = this.activeAlerts.get(key);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = Date.now();
      this.activeAlerts.delete(key);
      this.emit('alertResolved', alert);
    }
  }

  private getAlertMessage(type: string, metric: string, value: number, threshold: number): string {
    const metricDisplay = metric.replace(/([A-Z])/g, ' $1').toLowerCase();
    const valueFormatted = typeof value === 'number' ? value.toFixed(2) : value;

    switch (type) {
      case 'critical':
        return `Critical: ${metricDisplay} is ${valueFormatted}, exceeding critical threshold of ${threshold}`;
      case 'warning':
        return `Warning: ${metricDisplay} is ${valueFormatted}, exceeding warning threshold of ${threshold}`;
      case 'recovery':
        return `Recovery: ${metricDisplay} is back to normal at ${valueFormatted}`;
      default:
        return `${metricDisplay}: ${valueFormatted}`;
    }
  }

  // Public API methods

  public startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.startTime = Date.now();

    // Collect metrics periodically
    this.collectInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, 1000); // Collect every second

    this.emit('monitoringStarted');
  }

  public stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;

    if (this.collectInterval) {
      clearInterval(this.collectInterval);
      this.collectInterval = undefined;
    }

    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];

    this.emit('monitoringStopped');
  }

  private collectSystemMetrics(): void {
    if (typeof window === 'undefined') return;

    // Collect memory information if available
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.updateMetric('memory.used', memory.usedJSHeapSize);
      this.updateMetric('memory.total', memory.totalJSHeapSize);
      this.updateMetric('memory.percentage', (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100);
    }

    // Create snapshot of current metrics
    const metricsSnapshot: PerformanceMetrics = {
      timestamp: Date.now(),
      coreWebVitals: this.currentMetrics.coreWebVitals || {
        lcp: 0, fid: 0, cls: 0, ttfb: 0, fcp: 0
      },
      stateMachine: this.currentMetrics.stateMachine || {
        transitionTime: 0, stateChangeCount: 0, averageTransitionTime: 0,
        slowestTransition: { from: '', to: '', duration: 0, timestamp: 0 },
        totalTransitions: 0, errorCount: 0
      },
      network: this.currentMetrics.network || {
        latency: 0, requestCount: 0, failedRequests: 0, averageResponseTime: 0,
        slowestRequest: { url: '', duration: 0, timestamp: 0 },
        throughput: 0, connectionCount: 0
      },
      userInteraction: this.currentMetrics.userInteraction || {
        clickCount: this.userInteractionStats.clickCount,
        inputLatency: this.getAverage(this.userInteractionStats.inputLatencies),
        scrollPerformance: 0, pageLoadTime: 0, routeChangeTime: 0,
        componentRenderTime: 0, interactionToNextPaint: 0
      },
      memory: this.currentMetrics.memory || { used: 0, total: 0, percentage: 0 },
      cpu: this.currentMetrics.cpu || { usage: 0, loadAverage: [] }
    };

    this.metrics.push(metricsSnapshot);

    // Trim metrics if needed
    if (this.metrics.length > this.config.maxHistorySize) {
      this.metrics = this.metrics.slice(-this.config.maxHistorySize);
    }

    this.emit('metricsCollected', metricsSnapshot);
  }

  // State Machine Tracking Methods
  public trackStateTransition(from: string, to: string, duration: number): void {
    if (!this.config.enableStateMachineTracking || !this.shouldSample()) return;

    this.stateMachineStats.transitionTimes.push(duration);
    this.stateMachineStats.transitionCount++;

    if (!this.stateMachineStats.slowestTransition || duration > this.stateMachineStats.slowestTransition.duration) {
      this.stateMachineStats.slowestTransition = { from, to, duration, timestamp: Date.now() };
    }

    this.updateMetric('stateMachine.transitionTime', duration);
    this.updateMetric('stateMachine.averageTransitionTime', this.getAverage(this.stateMachineStats.transitionTimes));
    this.updateMetric('stateMachine.totalTransitions', this.stateMachineStats.transitionCount);
    this.updateMetric('stateMachine.slowestTransition', this.stateMachineStats.slowestTransition);
  }

  public trackStateMachineError(error: Error, context?: any): void {
    if (!this.config.enableStateMachineTracking) return;

    this.stateMachineStats.errorCount++;
    this.updateMetric('stateMachine.errorCount', this.stateMachineStats.errorCount);
    this.emit('stateMachineError', { error, context, timestamp: Date.now() });
  }

  // Component Render Tracking
  public trackComponentRender(componentName: string, renderTime: number): void {
    if (!this.config.enableUserInteractionTracking || !this.shouldSample()) return;

    this.userInteractionStats.renderTimes.push(renderTime);
    this.updateMetric('userInteraction.componentRenderTime', this.getAverage(this.userInteractionStats.renderTimes));

    this.emit('componentRender', { componentName, renderTime, timestamp: Date.now() });
  }

  // Route Change Tracking
  public trackRouteChange(from: string, to: string, duration: number): void {
    if (!this.config.enableUserInteractionTracking || !this.shouldSample()) return;

    this.updateMetric('userInteraction.routeChangeTime', duration);
    this.emit('routeChange', { from, to, duration, timestamp: Date.now() });
  }

  // Getter methods
  public getCurrentMetrics(): PerformanceMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] || null : null;
  }

  public getMetricsHistory(limit?: number): PerformanceMetrics[] {
    return limit ? this.metrics.slice(-limit) : [...this.metrics];
  }

  public getActiveAlerts(): PerformanceAlert[] {
    return Array.from(this.activeAlerts.values());
  }

  public getAllAlerts(limit?: number): PerformanceAlert[] {
    return limit ? this.alerts.slice(-limit) : [...this.alerts];
  }

  public getUptime(): number {
    return Date.now() - this.startTime;
  }

  public isActive(): boolean {
    return this.isMonitoring;
  }

  public updateConfig(newConfig: Partial<PerformanceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit('configUpdated', this.config);
  }

  public getConfig(): PerformanceConfig {
    return { ...this.config };
  }

  public generateReport(): {
    summary: any;
    metrics: PerformanceMetrics[];
    alerts: PerformanceAlert[];
    uptime: number;
  } {
    const currentMetrics = this.getCurrentMetrics();
    const activeAlerts = this.getActiveAlerts();

    return {
      summary: {
        uptime: this.getUptime(),
        totalMetrics: this.metrics.length,
        activeAlerts: activeAlerts.length,
        criticalAlerts: activeAlerts.filter(a => a.type === 'critical').length,
        current: currentMetrics
      },
      metrics: this.getMetricsHistory(100), // Last 100 data points
      alerts: this.getAllAlerts(50), // Last 50 alerts
      uptime: this.getUptime()
    };
  }

  public reset(): void {
    this.metrics = [];
    this.alerts = [];
    this.activeAlerts.clear();
    this.currentMetrics = {};
    this.stateMachineStats = {
      transitionTimes: [],
      transitionCount: 0,
      errorCount: 0,
      slowestTransition: null
    };
    this.networkStats = {
      requestTimes: [],
      requestCount: 0,
      failedRequests: 0,
      slowestRequest: null
    };
    this.userInteractionStats = {
      clickCount: 0,
      inputLatencies: [],
      renderTimes: []
    };
    this.startTime = Date.now();
    this.emit('reset');
  }

  public cleanup(): void {
    this.stopMonitoring();
    this.removeAllListeners();
  }
}

// Singleton instance for easy usage
let globalPerformanceMonitor: PerformanceMonitor | null = null;

export function getPerformanceMonitor(config?: Partial<PerformanceConfig>): PerformanceMonitor {
  if (!globalPerformanceMonitor) {
    globalPerformanceMonitor = new PerformanceMonitor(config);
  } else if (config) {
    // Update config if provided after initialization
    globalPerformanceMonitor.updateConfig(config);
  }
  return globalPerformanceMonitor;
}

export function setPerformanceMonitor(monitor: PerformanceMonitor): void {
  globalPerformanceMonitor = monitor;
}