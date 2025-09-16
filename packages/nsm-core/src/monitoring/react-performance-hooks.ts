/**
 * React Performance Monitoring Hooks
 * Easy-to-use React hooks for performance tracking in NSM applications
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { getPerformanceMonitor, PerformanceMetrics, PerformanceAlert, PerformanceConfig } from './performance-monitor';

/**
 * Main hook for performance monitoring
 */
export function usePerformanceMonitoring(config?: Partial<PerformanceConfig>) {
  const performanceMonitor = useMemo(() => getPerformanceMonitor(config), []);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [currentMetrics, setCurrentMetrics] = useState<PerformanceMetrics | null>(null);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);

  useEffect(() => {
    const monitor = performanceMonitor;

    const handleMetricsCollected = (metrics: PerformanceMetrics) => {
      setCurrentMetrics(metrics);
    };

    const handleAlert = (alert: PerformanceAlert) => {
      setAlerts(prev => [...prev, alert]);
    };

    const handleMonitoringStarted = () => {
      setIsMonitoring(true);
    };

    const handleMonitoringStopped = () => {
      setIsMonitoring(false);
    };

    monitor.on('metricsCollected', handleMetricsCollected);
    monitor.on('alert', handleAlert);
    monitor.on('monitoringStarted', handleMonitoringStarted);
    monitor.on('monitoringStopped', handleMonitoringStopped);

    // Initialize state
    setIsMonitoring(monitor.isActive());
    setCurrentMetrics(monitor.getCurrentMetrics());
    setAlerts(monitor.getActiveAlerts());

    return () => {
      monitor.off('metricsCollected', handleMetricsCollected);
      monitor.off('alert', handleAlert);
      monitor.off('monitoringStarted', handleMonitoringStarted);
      monitor.off('monitoringStopped', handleMonitoringStopped);
    };
  }, [performanceMonitor]);

  const startMonitoring = useCallback(() => {
    performanceMonitor.startMonitoring();
  }, [performanceMonitor]);

  const stopMonitoring = useCallback(() => {
    performanceMonitor.stopMonitoring();
  }, [performanceMonitor]);

  const getReport = useCallback(() => {
    return performanceMonitor.generateReport();
  }, [performanceMonitor]);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  return {
    isMonitoring,
    currentMetrics,
    alerts,
    startMonitoring,
    stopMonitoring,
    getReport,
    clearAlerts,
    monitor: performanceMonitor
  };
}

/**
 * Hook for tracking component render performance
 */
export function useRenderPerformance(componentName: string, enabled = true) {
  const performanceMonitor = useMemo(() => getPerformanceMonitor(), []);
  const renderStartTime = useRef<number>();
  const renderCount = useRef(0);
  const [averageRenderTime, setAverageRenderTime] = useState(0);
  const renderTimes = useRef<number[]>([]);

  useEffect(() => {
    if (!enabled) return;

    renderStartTime.current = performance.now();
  });

  useEffect(() => {
    if (!enabled || renderStartTime.current === undefined) return;

    const renderTime = performance.now() - renderStartTime.current;
    renderCount.current++;
    renderTimes.current.push(renderTime);

    // Keep only last 50 render times
    if (renderTimes.current.length > 50) {
      renderTimes.current = renderTimes.current.slice(-50);
    }

    const average = renderTimes.current.reduce((sum, time) => sum + time, 0) / renderTimes.current.length;
    setAverageRenderTime(average);

    performanceMonitor.trackComponentRender(componentName, renderTime);
  });

  const getRenderStats = useCallback(() => ({
    renderCount: renderCount.current,
    averageRenderTime,
    lastRenderTime: renderTimes.current[renderTimes.current.length - 1] || 0,
    renderTimes: [...renderTimes.current]
  }), [averageRenderTime]);

  return {
    renderCount: renderCount.current,
    averageRenderTime,
    getRenderStats
  };
}

/**
 * Hook for tracking user interactions
 */
export function useInteractionTracking(enabled = true) {
  const performanceMonitor = useMemo(() => getPerformanceMonitor(), []);
  const [interactionData, setInteractionData] = useState({
    clickCount: 0,
    averageResponseTime: 0,
    lastInteractionTime: 0
  });

  const trackClick = useCallback((event: React.MouseEvent, customData?: any) => {
    if (!enabled) return;

    const startTime = performance.now();
    const target = event.currentTarget as HTMLElement;
    const elementInfo = {
      tagName: target.tagName,
      id: target.id,
      className: target.className,
      ...customData
    };

    // Use requestAnimationFrame to measure response time
    requestAnimationFrame(() => {
      const responseTime = performance.now() - startTime;

      setInteractionData(prev => ({
        clickCount: prev.clickCount + 1,
        averageResponseTime: (prev.averageResponseTime + responseTime) / 2,
        lastInteractionTime: responseTime
      }));

      performanceMonitor.emit('userInteraction', {
        type: 'click',
        element: elementInfo,
        responseTime,
        timestamp: Date.now()
      });
    });
  }, [enabled, performanceMonitor]);

  const trackInput = useCallback((event: React.FormEvent, customData?: any) => {
    if (!enabled) return;

    const startTime = performance.now();
    const target = event.currentTarget as HTMLInputElement;
    const elementInfo = {
      type: target.type,
      name: target.name,
      value: target.value?.substring(0, 10), // Only first 10 chars for privacy
      ...customData
    };

    requestAnimationFrame(() => {
      const responseTime = performance.now() - startTime;

      setInteractionData(prev => ({
        ...prev,
        averageResponseTime: (prev.averageResponseTime + responseTime) / 2,
        lastInteractionTime: responseTime
      }));

      performanceMonitor.emit('userInteraction', {
        type: 'input',
        element: elementInfo,
        responseTime,
        timestamp: Date.now()
      });
    });
  }, [enabled, performanceMonitor]);

  return {
    interactionData,
    trackClick,
    trackInput
  };
}

/**
 * Hook for tracking page/route performance
 */
export function useRoutePerformance(routeName: string, enabled = true) {
  const performanceMonitor = useMemo(() => getPerformanceMonitor(), []);
  const routeStartTime = useRef<number>();
  const [routeMetrics, setRouteMetrics] = useState({
    loadTime: 0,
    isLoading: false,
    error: null as Error | null
  });

  const startRouteTracking = useCallback(() => {
    if (!enabled) return;

    routeStartTime.current = performance.now();
    setRouteMetrics(prev => ({ ...prev, isLoading: true, error: null }));
  }, [enabled]);

  const endRouteTracking = useCallback((success = true, error?: Error) => {
    if (!enabled || routeStartTime.current === undefined) return;

    const loadTime = performance.now() - routeStartTime.current;

    setRouteMetrics({
      loadTime,
      isLoading: false,
      error: error || null
    });

    performanceMonitor.trackRouteChange('previous', routeName, loadTime);

    if (error) {
      performanceMonitor.emit('routeError', {
        route: routeName,
        error,
        loadTime,
        timestamp: Date.now()
      });
    }
  }, [enabled, routeName, performanceMonitor]);

  // Auto-start tracking when component mounts
  useEffect(() => {
    startRouteTracking();
    return () => {
      endRouteTracking();
    };
  }, [startRouteTracking, endRouteTracking]);

  return {
    routeMetrics,
    startRouteTracking,
    endRouteTracking
  };
}

/**
 * Hook for tracking Core Web Vitals
 */
export function useCoreWebVitals() {
  const performanceMonitor = useMemo(() => getPerformanceMonitor(), []);
  const [webVitals, setWebVitals] = useState({
    lcp: 0,
    fid: 0,
    cls: 0,
    ttfb: 0,
    fcp: 0
  });

  useEffect(() => {
    const handleMetricsUpdate = (metrics: PerformanceMetrics) => {
      setWebVitals(metrics.coreWebVitals);
    };

    performanceMonitor.on('metricsCollected', handleMetricsUpdate);

    // Get initial metrics
    const currentMetrics = performanceMonitor.getCurrentMetrics();
    if (currentMetrics) {
      setWebVitals(currentMetrics.coreWebVitals);
    }

    return () => {
      performanceMonitor.off('metricsCollected', handleMetricsUpdate);
    };
  }, [performanceMonitor]);

  const getVitalsStatus = useCallback(() => {
    const config = performanceMonitor.getConfig();
    const thresholds = config.thresholds.coreWebVitals;

    return {
      lcp: {
        value: webVitals.lcp,
        status: webVitals.lcp <= thresholds.lcp.warning ? 'good'
               : webVitals.lcp <= thresholds.lcp.critical ? 'needs-improvement'
               : 'poor'
      },
      fid: {
        value: webVitals.fid,
        status: webVitals.fid <= thresholds.fid.warning ? 'good'
               : webVitals.fid <= thresholds.fid.critical ? 'needs-improvement'
               : 'poor'
      },
      cls: {
        value: webVitals.cls,
        status: webVitals.cls <= thresholds.cls.warning ? 'good'
               : webVitals.cls <= thresholds.cls.critical ? 'needs-improvement'
               : 'poor'
      }
    };
  }, [webVitals, performanceMonitor]);

  return {
    webVitals,
    getVitalsStatus
  };
}

/**
 * Hook for performance alerts
 */
export function usePerformanceAlerts(filterType?: string) {
  const performanceMonitor = useMemo(() => getPerformanceMonitor(), []);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [alertCount, setAlertCount] = useState({ critical: 0, warning: 0, info: 0 });

  useEffect(() => {
    const handleAlert = (alert: PerformanceAlert) => {
      if (!filterType || alert.type === filterType) {
        setAlerts(prev => {
          const newAlerts = [...prev, alert];
          // Keep only last 100 alerts
          return newAlerts.slice(-100);
        });
      }
    };

    const handleAlertResolved = (alert: PerformanceAlert) => {
      setAlerts(prev => prev.filter(a => a.id !== alert.id));
    };

    performanceMonitor.on('alert', handleAlert);
    performanceMonitor.on('alertResolved', handleAlertResolved);

    // Initialize with existing alerts
    const existingAlerts = performanceMonitor.getActiveAlerts();
    const filteredAlerts = filterType ? existingAlerts.filter(a => a.type === filterType) : existingAlerts;
    setAlerts(filteredAlerts);

    return () => {
      performanceMonitor.off('alert', handleAlert);
      performanceMonitor.off('alertResolved', handleAlertResolved);
    };
  }, [performanceMonitor, filterType]);

  useEffect(() => {
    const counts = alerts.reduce((acc, alert) => {
      acc[alert.type] = (acc[alert.type] || 0) + 1;
      return acc;
    }, { critical: 0, warning: 0, info: 0 } as any);

    setAlertCount(counts);
  }, [alerts]);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  const acknowledgeAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  }, []);

  return {
    alerts,
    alertCount,
    clearAlerts,
    acknowledgeAlert
  };
}

/**
 * Hook for custom performance metrics
 */
export function useCustomMetrics() {
  const performanceMonitor = useMemo(() => getPerformanceMonitor(), []);

  const trackCustomMetric = useCallback((name: string, value: number, tags?: Record<string, any>) => {
    performanceMonitor.emit('customMetric', {
      name,
      value,
      tags,
      timestamp: Date.now()
    });
  }, [performanceMonitor]);

  const trackTiming = useCallback((name: string, fn: () => Promise<any> | any) => {
    const startTime = performance.now();

    const result = fn();

    if (result instanceof Promise) {
      return result.finally(() => {
        const duration = performance.now() - startTime;
        trackCustomMetric(`${name}_duration`, duration, { type: 'async' });
      });
    } else {
      const duration = performance.now() - startTime;
      trackCustomMetric(`${name}_duration`, duration, { type: 'sync' });
      return result;
    }
  }, [trackCustomMetric]);

  const createTimer = useCallback((name: string) => {
    const startTime = performance.now();

    return {
      stop: (tags?: Record<string, any>) => {
        const duration = performance.now() - startTime;
        trackCustomMetric(`${name}_duration`, duration, tags);
        return duration;
      }
    };
  }, [trackCustomMetric]);

  return {
    trackCustomMetric,
    trackTiming,
    createTimer
  };
}

// Higher-order component for automatic performance tracking
export function withPerformanceTracking<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
) {
  const ComponentWithPerformance = (props: P) => {
    const displayName = componentName || WrappedComponent.displayName || WrappedComponent.name || 'Component';
    const { renderCount, averageRenderTime } = useRenderPerformance(displayName);

    return <WrappedComponent {...props} />;
  };

  ComponentWithPerformance.displayName = `withPerformanceTracking(${componentName || WrappedComponent.displayName || WrappedComponent.name})`;

  return ComponentWithPerformance;
}