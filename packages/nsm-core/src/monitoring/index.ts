/**
 * NSM Performance Monitoring System
 * Complete performance monitoring solution for NSM applications
 */

// Core monitoring system
export {
  PerformanceMonitor,
  getPerformanceMonitor,
  setPerformanceMonitor,
  type PerformanceMetrics,
  type CoreWebVitals,
  type StateMachineMetrics,
  type NetworkMetrics,
  type UserInteractionMetrics,
  type PerformanceAlert,
  type PerformanceConfig,
  type PerformanceThresholds
} from './performance-monitor';

// XState integration
export {
  StateMachinePerformanceTracker,
  getStateMachinePerformanceTracker,
  createPerformanceInterpreter,
  createPerformanceMiddleware,
  useStateMachinePerformance,
  type StateMachinePerformanceEntry,
  type StateMachinePerformanceConfig
} from './xstate-performance-middleware';

// React hooks
export {
  usePerformanceMonitoring,
  useRenderPerformance,
  useInteractionTracking,
  useRoutePerformance,
  useCoreWebVitals,
  usePerformanceAlerts,
  useCustomMetrics,
  withPerformanceTracking
} from './react-performance-hooks';

// Dashboard components
export {
  default as PerformanceDashboard,
  PerformanceIndicator
} from './performance-dashboard';

// Utilities and helpers
export const PerformanceUtils = {
  /**
   * Format performance values for display
   */
  formatValue: (value: number, unit: string = 'ms'): string => {
    if (value === 0) return '0' + unit;
    if (value < 1) return (value * 1000).toFixed(0) + 'μs';
    if (value < 1000) return value.toFixed(1) + unit;
    return (value / 1000).toFixed(2) + 's';
  },

  /**
   * Format bytes for display
   */
  formatBytes: (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  /**
   * Get status color for performance metrics
   */
  getStatusColor: (status: 'good' | 'needs-improvement' | 'poor'): string => {
    switch (status) {
      case 'good': return '#10b981';
      case 'needs-improvement': return '#f59e0b';
      case 'poor': return '#ef4444';
      default: return '#6b7280';
    }
  },

  /**
   * Calculate Core Web Vitals status
   */
  calculateWebVitalsStatus: (
    lcp: number,
    fid: number,
    cls: number,
    thresholds?: {
      lcp: { warning: number; critical: number };
      fid: { warning: number; critical: number };
      cls: { warning: number; critical: number };
    }
  ) => {
    const defaultThresholds = {
      lcp: { warning: 2500, critical: 4000 },
      fid: { warning: 100, critical: 300 },
      cls: { warning: 0.1, critical: 0.25 }
    };

    const t = thresholds || defaultThresholds;

    return {
      lcp: lcp <= t.lcp.warning ? 'good' : lcp <= t.lcp.critical ? 'needs-improvement' : 'poor',
      fid: fid <= t.fid.warning ? 'good' : fid <= t.fid.critical ? 'needs-improvement' : 'poor',
      cls: cls <= t.cls.warning ? 'good' : cls <= t.cls.critical ? 'needs-improvement' : 'poor'
    } as const;
  },

  /**
   * Create a performance timer
   */
  createTimer: (name?: string) => {
    const startTime = performance.now();
    return {
      stop: () => {
        const duration = performance.now() - startTime;
        if (name) {
          console.log(`⚡ ${name}: ${PerformanceUtils.formatValue(duration)}`);
        }
        return duration;
      },
      lap: () => {
        return performance.now() - startTime;
      }
    };
  },

  /**
   * Measure function execution time
   */
  measureFunction: async <T>(fn: () => T | Promise<T>, name?: string): Promise<{ result: T; duration: number }> => {
    const timer = PerformanceUtils.createTimer(name);
    const result = await fn();
    const duration = timer.stop();
    return { result, duration };
  },

  /**
   * Check if performance monitoring is supported
   */
  isSupported: (): boolean => {
    return typeof window !== 'undefined' &&
           'performance' in window &&
           'PerformanceObserver' in window;
  },

  /**
   * Get performance entry by name
   */
  getPerformanceEntry: (name: string, type?: string): PerformanceEntry | null => {
    if (!PerformanceUtils.isSupported()) return null;

    const entries = performance.getEntriesByName(name, type);
    return entries.length > 0 ? entries[entries.length - 1] : null;
  },

  /**
   * Clear performance entries
   */
  clearPerformanceEntries: (type?: string): void => {
    if (!PerformanceUtils.isSupported()) return;

    if (type) {
      performance.clearResourceTimings();
    } else {
      performance.clearMarks();
      performance.clearMeasures();
      performance.clearResourceTimings();
    }
  },

  /**
   * Create performance mark
   */
  mark: (name: string): void => {
    if (!PerformanceUtils.isSupported()) return;
    performance.mark(name);
  },

  /**
   * Create performance measure
   */
  measure: (name: string, startMark?: string, endMark?: string): number => {
    if (!PerformanceUtils.isSupported()) return 0;

    performance.measure(name, startMark, endMark);
    const entry = PerformanceUtils.getPerformanceEntry(name, 'measure');
    return entry ? entry.duration : 0;
  }
};

// Default configuration
export const DEFAULT_PERFORMANCE_CONFIG = {
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
  alertCooldownMs: 60000
} as const;

// Quick setup function for easy initialization
export const setupPerformanceMonitoring = (config?: Partial<PerformanceConfig>) => {
  const monitor = getPerformanceMonitor(config);

  // Auto-start monitoring if enabled
  if (config?.enabled !== false) {
    monitor.startMonitoring();
  }

  return monitor;
};

// TypeScript type guards
export const isPerformanceMetrics = (obj: any): obj is PerformanceMetrics => {
  return obj &&
         typeof obj.timestamp === 'number' &&
         obj.coreWebVitals &&
         obj.stateMachine &&
         obj.network &&
         obj.userInteraction &&
         obj.memory;
};

export const isPerformanceAlert = (obj: any): obj is PerformanceAlert => {
  return obj &&
         typeof obj.id === 'string' &&
         typeof obj.type === 'string' &&
         typeof obj.metric === 'string' &&
         typeof obj.value === 'number' &&
         typeof obj.threshold === 'number' &&
         typeof obj.timestamp === 'number';
};