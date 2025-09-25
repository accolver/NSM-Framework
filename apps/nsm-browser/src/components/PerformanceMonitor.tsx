import { useState, useEffect } from 'react';

interface PerformanceMetrics {
  transitionTimes?: Array<{ from?: string; to?: string; duration: number }>;
  renderTimes?: number[];
  frameDrops?: number;
  networkRequests?: Array<{ url: string; duration: number; size: number }>;
}

interface PerformanceMonitorProps {
  application: {
    name: string;
    [key: string]: any;
  };
  metrics?: PerformanceMetrics;
  isProfileActive?: boolean;
  profilingData?: {
    timeline: Array<{
      event: string;
      timestamp: number;
      duration: number;
    }>;
  };
  thresholds?: {
    maxTransitionTime?: number;
  };
}

export default function PerformanceMonitor({
  application,
  metrics = {},
  isProfileActive = false,
  profilingData,
  thresholds = { maxTransitionTime: 50 }
}: PerformanceMonitorProps) {
  const [profiling, setProfiling] = useState(isProfileActive);
  const [memoryUsage, setMemoryUsage] = useState<number>(0);

  useEffect(() => {
    // Monitor memory usage if available
    if ('memory' in performance && (performance as any).memory) {
      const memory = (performance as any).memory;
      setMemoryUsage(memory.usedJSHeapSize);
    }
  }, []);

  const calculateAverageTransitionTime = () => {
    if (!metrics.transitionTimes || metrics.transitionTimes.length === 0) return 0;
    const total = metrics.transitionTimes.reduce((sum, t) => sum + t.duration, 0);
    return Math.round(total / metrics.transitionTimes.length);
  };

  const calculateAverageRenderTime = () => {
    if (!metrics.renderTimes || metrics.renderTimes.length === 0) return 0;
    const total = metrics.renderTimes.reduce((sum, t) => sum + t, 0);
    return Math.round(total / metrics.renderTimes.length);
  };

  const calculateAverageNetworkTime = () => {
    if (!metrics.networkRequests || metrics.networkRequests.length === 0) return 0;
    const total = metrics.networkRequests.reduce((sum, r) => sum + r.duration, 0);
    return Math.round(total / metrics.networkRequests.length);
  };

  const hasPerformanceWarnings = () => {
    const avgTransition = calculateAverageTransitionTime();
    const avgRender = calculateAverageRenderTime();

    return (
      (thresholds.maxTransitionTime && avgTransition > thresholds.maxTransitionTime) ||
      avgRender > 80 ||
      (metrics.frameDrops && metrics.frameDrops > 0)
    );
  };

  const formatMemory = (bytes: number) => {
    return `${Math.round(bytes / (1024 * 1024))} MB`;
  };

  const handleStartProfiling = () => {
    setProfiling(true);
  };

  const handleStopProfiling = () => {
    setProfiling(false);
  };

  const handleExportResults = () => {
    const results = {
      application: application.name,
      metrics,
      profilingData,
      timestamp: Date.now()
    };

    const blob = new Blob([JSON.stringify(results, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${application.name}-performance.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const avgTransitionTime = calculateAverageTransitionTime();
  const avgRenderTime = calculateAverageRenderTime();
  const avgNetworkTime = calculateAverageNetworkTime();

  return (
    <div className="performance-monitor">
      <h2>Performance Metrics</h2>

      <div className="metrics-grid">
        <div className="metric-card">
          <h3>State Transitions</h3>
          {metrics.transitionTimes && metrics.transitionTimes.length > 0 ? (
            <>
              <div className="metric-value">
                Avg: {avgTransitionTime} ms
              </div>
              {avgTransitionTime > (thresholds.maxTransitionTime || 50) && (
                <div data-testid="slow-transition-warning" className="warning">
                  ⚠️ Slow transitions detected
                </div>
              )}
            </>
          ) : (
            <div>No data</div>
          )}
        </div>

        <div className="metric-card">
          <h3>UI Rendering</h3>
          {metrics.renderTimes && metrics.renderTimes.length > 0 ? (
            <>
              <div className="metric-value">
                Avg: {avgRenderTime} ms
              </div>
              {metrics.frameDrops && metrics.frameDrops > 0 && (
                <div>{metrics.frameDrops} frames dropped</div>
              )}
            </>
          ) : (
            <div>No data</div>
          )}
        </div>

        <div className="metric-card">
          <h3>Memory Usage</h3>
          <div className="metric-value">
            {formatMemory(memoryUsage)} used
          </div>
        </div>

        <div className="metric-card">
          <h3>Network</h3>
          {metrics.networkRequests && metrics.networkRequests.length > 0 ? (
            <>
              <div>{metrics.networkRequests.length} requests</div>
              <div>Avg: {avgNetworkTime} ms</div>
            </>
          ) : (
            <div>No network data</div>
          )}
        </div>
      </div>

      {hasPerformanceWarnings() && (
        <div className="performance-warning">
          <h3>Performance Warning</h3>
          <div className="suggestions">
            <h4>Suggestions:</h4>
            {avgRenderTime > 80 && (
              <div>• Optimize UI rendering performance</div>
            )}
            {avgTransitionTime > (thresholds.maxTransitionTime || 50) && (
              <div>• Reduce state transition complexity</div>
            )}
          </div>
        </div>
      )}

      <div className="profiling-controls">
        {!profiling ? (
          <button onClick={handleStartProfiling}>
            Start Profiling
          </button>
        ) : (
          <>
            <button onClick={handleStopProfiling}>
              Stop Profiling
            </button>
            <div>Profiling active...</div>
          </>
        )}

        {profilingData && (
          <button onClick={handleExportResults}>
            Export Results
          </button>
        )}
      </div>

      {profilingData && (
        <div data-testid="profiling-timeline" className="profiling-timeline">
          <h3>Profiling Timeline</h3>
          {profilingData.timeline.map((event, index) => (
            <div key={index} className="timeline-event">
              <span className="event-name">{event.event}</span>
              <span className="event-duration">{event.duration}ms</span>
            </div>
          ))}
        </div>
      )}

      {avgTransitionTime > (thresholds.maxTransitionTime || 50) && (
        <div data-testid="threshold-exceeded-alert" className="alert">
          Performance threshold exceeded!
        </div>
      )}
    </div>
  );
}