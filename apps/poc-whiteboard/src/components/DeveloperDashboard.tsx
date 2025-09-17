import React, { useState, useEffect, useCallback, useRef } from 'react';
import { EventLogViewer } from './EventLogViewer';
import { TimeTravelDebugger } from './TimeTravelDebugger';
import type { EventLogService } from '../services/event-log-service';
import type { TimeTravelService } from '../services/time-travel-service';
import type { InspectorService } from '../services/inspector-service';

/**
 * Developer Dashboard Props
 */
export interface DeveloperDashboardProps {
  eventLogService: EventLogService;
  timeTravelService: TimeTravelService;
  inspectorService: InspectorService;
  className?: string;
}

/**
 * Available dashboard tools
 */
type DashboardTool = 'inspector' | 'eventlog' | 'timetravel' | 'appdiscovery' | 'performance';

/**
 * Layout configuration for the dashboard
 */
interface DashboardLayout {
  width: number;
  activeTab: DashboardTool;
  isMinimized: boolean;
  tabOrder: DashboardTool[];
}

/**
 * Default dashboard layout
 */
const DEFAULT_LAYOUT: DashboardLayout = {
  width: 400,
  activeTab: 'inspector',
  isMinimized: false,
  tabOrder: ['inspector', 'eventlog', 'timetravel', 'appdiscovery', 'performance']
};

/**
 * Local storage key for persisting layout
 */
const LAYOUT_STORAGE_KEY = 'nsm-dashboard-layout';

/**
 * Performance metrics interface
 */
interface PerformanceMetrics {
  memoryUsage: number;
  eventCount: number;
  networkActivity: number;
  lastUpdated: number;
}

/**
 * Mock NSM application for discovery
 */
interface NSMApplication {
  id: string;
  name: string;
  type: string;
  status: 'connected' | 'disconnected' | 'connecting';
  url?: string;
  lastSeen: number;
}

/**
 * Comprehensive Developer Dashboard Component
 *
 * Integrates all NSM developer tools into a unified interface:
 * - XState Inspector for state machine visualization
 * - Event Log for Nostr event monitoring
 * - Time Travel debugging for state replay
 * - Application Discovery for finding NSM apps
 * - Performance monitoring for metrics tracking
 */
export const DeveloperDashboard: React.FC<DeveloperDashboardProps> = ({
  eventLogService,
  timeTravelService,
  inspectorService,
  className = ''
}) => {
  // Layout and UI state
  const [layout, setLayout] = useState<DashboardLayout>(DEFAULT_LAYOUT);
  const [isResizing, setIsResizing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Performance monitoring state
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    memoryUsage: 0,
    eventCount: 0,
    networkActivity: 0,
    lastUpdated: Date.now()
  });

  // Application discovery state
  const [discoveredApps, setDiscoveredApps] = useState<NSMApplication[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  // Error handling state
  const [errors, setErrors] = useState<Record<DashboardTool, string | null>>({
    inspector: null,
    eventlog: null,
    timetravel: null,
    appdiscovery: null,
    performance: null
  });

  // Refs for DOM manipulation
  const dashboardRef = useRef<HTMLDivElement>(null);
  const resizeHandleRef = useRef<HTMLDivElement>(null);

  // Tab definitions
  const tabs = [
    { id: 'inspector', label: 'XState Inspector', shortcut: '1' },
    { id: 'eventlog', label: 'Event Log', shortcut: '2' },
    { id: 'timetravel', label: 'Time Travel', shortcut: '3' },
    { id: 'appdiscovery', label: 'App Discovery', shortcut: '4' },
    { id: 'performance', label: 'Performance', shortcut: '5' }
  ] as const;

  // Load saved layout from localStorage
  useEffect(() => {
    const savedLayout = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (savedLayout) {
      try {
        const parsedLayout = JSON.parse(savedLayout);
        setLayout({ ...DEFAULT_LAYOUT, ...parsedLayout });
      } catch (error) {
        console.warn('Failed to load dashboard layout:', error);
      }
    }
  }, []);

  // Save layout to localStorage
  const saveLayout = useCallback((newLayout: Partial<DashboardLayout>) => {
    const updatedLayout = { ...layout, ...newLayout };
    setLayout(updatedLayout);
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(updatedLayout));
  }, [layout]);

  // Handle responsive design
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt+D to toggle dashboard
      if (e.altKey && e.key === 'd') {
        e.preventDefault();
        saveLayout({ isMinimized: !layout.isMinimized });
        return;
      }

      // Ctrl+Shift+I for inspector
      if (e.ctrlKey && e.shiftKey && e.key === 'i') {
        e.preventDefault();
        saveLayout({ activeTab: 'inspector', isMinimized: false });
        return;
      }

      // Number keys for tab switching
      const numberKeys = ['1', '2', '3', '4', '5'];
      const keyIndex = numberKeys.indexOf(e.key);
      if (keyIndex !== -1 && keyIndex < tabs.length) {
        e.preventDefault();
        saveLayout({ activeTab: tabs[keyIndex]?.id as DashboardTool });
        return;
      }

      // Arrow navigation within tabs
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const currentIndex = tabs.findIndex(tab => tab.id === layout.activeTab);
        if (currentIndex !== -1) {
          const direction = e.key === 'ArrowLeft' ? -1 : 1;
          const nextIndex = (currentIndex + direction + tabs.length) % tabs.length;
          e.preventDefault();
          saveLayout({ activeTab: tabs[nextIndex]?.id as DashboardTool });
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [layout.activeTab, layout.isMinimized, saveLayout]);

  // Performance monitoring
  useEffect(() => {
    const updateMetrics = () => {
      const metrics: PerformanceMetrics = {
        memoryUsage: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) : 0,
        eventCount: eventLogService && typeof eventLogService.getEventCount === 'function' ? eventLogService.getEventCount() : 0,
        networkActivity: Math.floor(Math.random() * 100), // Mock network activity
        lastUpdated: Date.now()
      };
      setPerformanceMetrics(metrics);
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 2000);
    return () => clearInterval(interval);
  }, [eventLogService]);

  // Application discovery (mock implementation)
  useEffect(() => {
    const discoverApplications = async () => {
      setIsScanning(true);

      // Mock discovery delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock discovered applications
      const mockApps: NSMApplication[] = [
        {
          id: 'whiteboard-app',
          name: 'NSM Whiteboard',
          type: 'collaborative-canvas',
          status: 'connected',
          url: 'http://localhost:3001',
          lastSeen: Date.now()
        },
        {
          id: 'wordle-app',
          name: 'NSM Wordle',
          type: 'game',
          status: 'disconnected',
          url: 'http://localhost:3002',
          lastSeen: Date.now() - 300000
        }
      ];

      setDiscoveredApps(mockApps);
      setIsScanning(false);
    };

    if (layout.activeTab === 'appdiscovery') {
      discoverApplications();
    }
  }, [layout.activeTab]);

  // Handle tab switching
  const handleTabClick = useCallback((tabId: DashboardTool) => {
    saveLayout({ activeTab: tabId });
  }, [saveLayout]);

  // Handle minimize/maximize
  const handleToggleMinimize = useCallback(() => {
    saveLayout({ isMinimized: !layout.isMinimized });
  }, [layout.isMinimized, saveLayout]);

  // Handle resize
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (dashboardRef.current) {
        const rect = dashboardRef.current.getBoundingClientRect();
        const newWidth = Math.max(300, Math.min(800, e.clientX - rect.left));
        saveLayout({ width: newWidth });
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, saveLayout]);

  // Service availability checks
  const serviceAvailable = {
    eventlog: !!eventLogService,
    timetravel: !!timeTravelService,
    inspector: !!inspectorService
  };

  const hasErrors = Object.values(errors).some(error => error !== null);
  const someServicesUnavailable = !Object.values(serviceAvailable).every(Boolean);

  // Error boundary component
  const ErrorBoundary: React.FC<{ children: React.ReactNode; toolName: string }> = ({ children, toolName }) => {
    try {
      return <>{children}</>;
    } catch (error) {
      return (
        <div className="error-state">
          <h3>Something went wrong in the {toolName} tool</h3>
          <p>Please try refreshing or switching to another tool.</p>
        </div>
      );
    }
  };

  // Render tool content
  const renderToolContent = () => {
    const { activeTab } = layout;

    switch (activeTab) {
      case 'inspector':
        if (!serviceAvailable.inspector) {
          return <div className="service-unavailable">XState Inspector service not available</div>;
        }
        return (
          <ErrorBoundary toolName="XState Inspector">
            <div className="inspector-panel">
              <h3>XState Inspector</h3>
              <p>State machine visualization and debugging</p>

              <div className="inspector-status">
                <div className={`status-indicator ${inspectorService?.isConnected ? 'connected' : 'disconnected'}`}>
                  Status: {inspectorService?.isConnected ? 'Connected' : 'Disconnected'}
                </div>
              </div>

              {inspectorService?.isConnected ? (
                <div className="inspector-connected">
                  <h4>Inspector Active</h4>
                  <p>The XState Inspector is running. The visualization should be available in:</p>
                  <ul style={{ margin: '8px 0', paddingLeft: '20px', color: '#d4d4d4' }}>
                    <li>A popup window (if not blocked)</li>
                    <li>Or visit <a href="https://stately.ai/viz" target="_blank" rel="noopener noreferrer" style={{ color: '#4fc3f7' }}>https://stately.ai/viz</a></li>
                  </ul>

                  <div className="registered-actors">
                    <h5>Registered Actors:</h5>
                    {inspectorService.getRegisteredActors().length > 0 ? (
                      <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                        {inspectorService.getRegisteredActors().map(name => (
                          <li key={name} style={{ color: '#4caf50' }}>{name}</li>
                        ))}
                      </ul>
                    ) : (
                      <p style={{ color: '#ff9800', fontSize: '12px' }}>No actors registered yet</p>
                    )}
                  </div>

                  <div className="inspector-actions" style={{ marginTop: '16px' }}>
                    <button
                      onClick={() => window.open('https://stately.ai/viz', '_blank')}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#007acc',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        marginRight: '8px'
                      }}
                    >
                      Open Visualizer
                    </button>
                    <button
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('🔍 RECONNECT BUTTON CLICKED - Starting reconnection...');

                        try {
                          console.log('🔍 Disconnecting first...');
                          await inspectorService.disconnect();
                          console.log('🔍 Disconnected, now reconnecting...');
                          const reconnected = await inspectorService.connect();
                          console.log('🔍 Reconnection result:', reconnected);

                          if (reconnected) {
                            console.log('🔍 Reconnection successful!');
                            // Force re-render
                            setLayout(prev => ({ ...prev, activeTab: 'inspector' }));
                          }
                        } catch (error) {
                          console.error('🔍 Manual reconnection failed:', error);
                          console.error('🔍 Reconnection error details:', {
                            message: error?.message,
                            stack: error?.stack,
                            name: error?.name
                          });
                        }
                      }}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#ff9800',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Reconnect
                    </button>
                  </div>
                </div>
              ) : (
                <div className="inspector-disconnected">
                  <h4>Inspector Not Connected</h4>
                  <p style={{ color: '#ff9800' }}>
                    The XState Inspector could not connect. This may be due to:
                  </p>
                  <ul style={{ margin: '8px 0', paddingLeft: '20px', color: '#999', fontSize: '12px' }}>
                    <li>Popup blocking in your browser</li>
                    <li>Network connectivity issues</li>
                    <li>Being in a test environment</li>
                  </ul>
                  <p style={{ fontSize: '12px', color: '#666' }}>
                    Check the browser console for more details.
                  </p>

                  <div className="inspector-actions" style={{ marginTop: '16px' }}>
                    <button
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('🔍 RETRY BUTTON CLICKED - Starting manual connection attempt...');

                        try {
                          // Add environment debugging
                          console.log('🔍 Environment check:', {
                            NODE_ENV: process.env.NODE_ENV,
                            hasWindow: typeof window !== 'undefined',
                            windowOpen: typeof window.open,
                            isTestEnvironment:
                              process.env.NODE_ENV === 'test' ||
                              typeof (globalThis as any).expect !== 'undefined' ||
                              typeof (globalThis as any).vi !== 'undefined' ||
                              typeof (globalThis as any).jest !== 'undefined'
                          });

                          // Add more verbose logging
                          console.log('🔍 Inspector Service State:', {
                            isConnected: inspectorService?.isConnected,
                            hasInspectorService: !!inspectorService,
                            inspectorServiceType: typeof inspectorService
                          });

                          // Test dynamic import first
                          console.log('🔍 Testing dynamic import of @statelyai/inspect...');
                          try {
                            const { createBrowserInspector } = await import('@statelyai/inspect');
                            console.log('🔍 Dynamic import successful:', typeof createBrowserInspector);
                          } catch (importError) {
                            console.error('🔍 Dynamic import failed:', importError);
                            throw importError;
                          }

                          console.log('🔍 Attempting to connect...');
                          const connected = await inspectorService.connect();
                          console.log('🔍 Connection result:', connected);

                          if (connected) {
                            console.log('🔍 Connection successful! Inspector should now be active.');
                            // Force re-render to update UI
                            setLayout(prev => ({ ...prev, activeTab: 'inspector' }));
                          } else {
                            console.warn('🔍 Connection failed - no error thrown but returned false');
                          }
                        } catch (error) {
                          console.error('🔍 Manual connection failed with error:', error);
                          console.error('🔍 Error details:', {
                            message: error?.message,
                            stack: error?.stack,
                            name: error?.name
                          });
                        }
                      }}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#4caf50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Retry Connection
                    </button>
                    <button
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('🔍 TEST BUTTON CLICKED - Running comprehensive diagnostics...');

                        // Test 1: Check browser environment
                        console.log('🔍 Test 1 - Browser Environment:', {
                          window: typeof window !== 'undefined',
                          windowOpen: typeof window?.open,
                          navigator: typeof navigator !== 'undefined',
                          userAgent: navigator?.userAgent
                        });

                        // Test 2: Test popup functionality
                        console.log('🔍 Test 2 - Testing popup functionality...');
                        try {
                          const testPopup = window.open('about:blank', 'test-popup', 'width=100,height=100');
                          if (testPopup) {
                            console.log('🔍 Popup test successful - closing test window');
                            testPopup.close();
                          } else {
                            console.warn('🔍 Popup blocked or failed to open');
                          }
                        } catch (popupError) {
                          console.error('🔍 Popup test error:', popupError);
                        }

                        // Test 3: Test direct @statelyai/inspect usage
                        console.log('🔍 Test 3 - Testing direct @statelyai/inspect...');
                        try {
                          const { createBrowserInspector } = await import('@statelyai/inspect');
                          console.log('🔍 Import successful, creating test inspector...');

                          const testInspector = createBrowserInspector({
                            url: 'https://stately.ai/viz',
                            window: window,
                            iframe: null,
                            autoStart: false
                          });

                          console.log('🔍 Test inspector created:', !!testInspector);
                          console.log('🔍 Inspector methods:', {
                            start: typeof testInspector?.start,
                            stop: typeof testInspector?.stop,
                            inspect: typeof testInspector?.inspect
                          });

                          // Try to start it
                          try {
                            testInspector?.start();
                            console.log('🔍 Test inspector started successfully!');
                            setTimeout(() => {
                              try {
                                testInspector?.stop();
                                console.log('🔍 Test inspector stopped');
                              } catch (stopError) {
                                console.error('🔍 Test inspector stop error:', stopError);
                              }
                            }, 2000);
                          } catch (startError) {
                            console.error('🔍 Test inspector start error:', startError);
                          }
                        } catch (testError) {
                          console.error('🔍 Direct test failed:', testError);
                        }

                        console.log('🔍 Diagnostics complete - check console for results');
                      }}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#9c27b0',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        marginLeft: '8px'
                      }}
                    >
                      Test Inspector
                    </button>
                  </div>
                </div>
              )}
            </div>
          </ErrorBoundary>
        );

      case 'eventlog':
        if (!serviceAvailable.eventlog) {
          return <div className="service-unavailable">Service Unavailable</div>;
        }
        return (
          <ErrorBoundary toolName="Event Log">
            <EventLogViewer
              eventLogService={eventLogService}
              className="h-full"
            />
          </ErrorBoundary>
        );

      case 'timetravel':
        if (!serviceAvailable.timetravel) {
          return <div className="service-unavailable">Time Travel service not available</div>;
        }
        return (
          <ErrorBoundary toolName="Time Travel">
            <TimeTravelDebugger
              timeTravelService={timeTravelService}
              className="h-full"
            />
          </ErrorBoundary>
        );

      case 'appdiscovery':
        return (
          <ErrorBoundary toolName="App Discovery">
            <div className="app-discovery-panel">
              <h3>NSM Application Discovery</h3>
              <p>Discover and connect to NSM applications on the network</p>

              {isScanning ? (
                <div className="scanning-state">
                  <p>Scanning for NSM applications...</p>
                  <div className="loading-spinner" />
                </div>
              ) : (
                <div className="discovered-apps">
                  <h4>Found Applications</h4>
                  {discoveredApps.length === 0 ? (
                    <p>No NSM applications discovered</p>
                  ) : (
                    <div className="app-list">
                      {discoveredApps.map(app => (
                        <div key={app.id} className="app-item">
                          <div className="app-info">
                            <h5>{app.name}</h5>
                            <p>Type: {app.type}</p>
                            <p>Status: {app.status}</p>
                          </div>
                          <button
                            className={`connect-btn ${app.status === 'connected' ? 'connected' : ''}`}
                            onClick={() => {
                              // Mock connection toggle
                              const newStatus = app.status === 'connected' ? 'disconnected' : 'connected';
                              setDiscoveredApps(prev =>
                                prev.map(a => a.id === app.id ? { ...a, status: newStatus } : a)
                              );
                            }}
                          >
                            {app.status === 'connected' ? 'Connected' : 'Connect'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </ErrorBoundary>
        );

      case 'performance':
        return (
          <ErrorBoundary toolName="Performance Monitor">
            <div className="performance-panel">
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

      default:
        return <div>Unknown tool: {activeTab}</div>;
    }
  };

  // Don't render if minimized
  if (layout.isMinimized) {
    return null;
  }

  return (
    <div
      ref={dashboardRef}
      data-testid="dashboard-container"
      className={`developer-dashboard ${isMobile ? 'mobile-layout' : ''} ${className}`}
      style={{ width: layout.width }}
      role="region"
      aria-label="Developer Tools Dashboard"
    >
      <style>{`
        .developer-dashboard {
          position: fixed;
          top: 0;
          right: 0;
          height: 100vh;
          background: #1e1e1e;
          color: #d4d4d4;
          font-family: 'SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', monospace;
          font-size: 12px;
          border-left: 1px solid #333;
          z-index: 1000;
          display: flex;
          flex-direction: column;
        }

        .mobile-layout {
          position: relative;
          width: 100% !important;
          height: auto;
        }

        .dashboard-header {
          padding: 12px 16px;
          background: #2d2d30;
          border-bottom: 1px solid #333;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .dashboard-title h2 {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
          color: #ffffff;
        }

        .dashboard-title p {
          margin: 2px 0 0 0;
          font-size: 11px;
          color: #999;
        }

        .dashboard-controls {
          display: flex;
          gap: 8px;
        }

        .control-btn {
          background: transparent;
          border: 1px solid #555;
          color: #d4d4d4;
          padding: 4px 8px;
          border-radius: 3px;
          cursor: pointer;
          font-size: 10px;
        }

        .control-btn:hover {
          background: #333;
        }

        .tab-container {
          display: flex;
          background: #252526;
          border-bottom: 1px solid #333;
          overflow-x: auto;
        }

        .vertical-tabs {
          flex-direction: column;
        }

        .tab {
          padding: 8px 12px;
          cursor: pointer;
          border-right: 1px solid #333;
          background: #2d2d30;
          color: #999;
          transition: all 0.2s;
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .tab:hover {
          background: #333;
          color: #fff;
        }

        .tab.active {
          background: #007acc;
          color: #fff;
          border-bottom: 2px solid #007acc;
        }

        .tab-shortcut {
          font-size: 10px;
          opacity: 0.6;
          background: #333;
          padding: 1px 4px;
          border-radius: 2px;
        }

        .tool-content {
          flex: 1;
          overflow: hidden;
          background: #1e1e1e;
        }

        .service-unavailable {
          padding: 20px;
          text-align: center;
          color: #ff6b6b;
        }

        .error-state {
          padding: 20px;
          text-align: center;
          color: #ff6b6b;
        }

        .error-state h3 {
          color: #ff6b6b;
          margin: 0 0 8px 0;
        }

        .inspector-panel, .app-discovery-panel, .performance-panel {
          padding: 16px;
          height: 100%;
          overflow-y: auto;
        }

        .inspector-panel h3, .app-discovery-panel h3, .performance-panel h3 {
          margin: 0 0 8px 0;
          color: #4fc3f7;
        }

        .inspector-status {
          margin-top: 16px;
          padding: 8px;
          background: #252526;
          border: 1px solid #333;
          border-radius: 4px;
        }

        .scanning-state {
          text-align: center;
          padding: 20px;
        }

        .loading-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid #333;
          border-top: 2px solid #007acc;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 8px auto;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .app-list {
          margin-top: 16px;
        }

        .app-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          margin: 8px 0;
          background: #252526;
          border: 1px solid #333;
          border-radius: 4px;
        }

        .app-info h5 {
          margin: 0 0 4px 0;
          color: #fff;
        }

        .app-info p {
          margin: 2px 0;
          font-size: 11px;
          color: #999;
        }

        .connect-btn {
          padding: 6px 12px;
          background: #007acc;
          color: white;
          border: none;
          border-radius: 3px;
          cursor: pointer;
          font-size: 11px;
        }

        .connect-btn.connected {
          background: #4caf50;
        }

        .connect-btn:hover {
          opacity: 0.8;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 12px;
          margin: 16px 0;
        }

        .metric-card {
          padding: 12px;
          background: #252526;
          border: 1px solid #333;
          border-radius: 4px;
          text-align: center;
        }

        .metric-card h4 {
          margin: 0 0 8px 0;
          font-size: 11px;
          color: #999;
        }

        .metric-value {
          font-size: 18px;
          font-weight: bold;
          color: #4fc3f7;
        }

        .resize-handle {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          background: transparent;
          cursor: ew-resize;
          z-index: 10;
        }

        .resize-handle:hover {
          background: #007acc;
        }

        .minimized {
          display: none;
        }

        .status-indicator {
          margin-left: 8px;
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 3px;
        }

        .status-warning {
          background: #ff9800;
          color: #000;
        }

        .status-indicator.connected {
          color: #4caf50;
          font-weight: bold;
        }

        .status-indicator.disconnected {
          color: #ff9800;
          font-weight: bold;
        }

        .shortcuts-panel {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: #2d2d30;
          border-top: 1px solid #333;
          padding: 8px 16px;
          font-size: 10px;
          color: #666;
        }

        .shortcuts-panel h4 {
          margin: 0 0 4px 0;
          color: #999;
        }

        .shortcut-list {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
        }

        .shortcut-item {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .shortcut-key {
          background: #333;
          padding: 1px 4px;
          border-radius: 2px;
          font-family: monospace;
        }
      `}</style>

      {/* Resize handle */}
      <div
        ref={resizeHandleRef}
        data-testid="resize-handle"
        className="resize-handle"
        onMouseDown={handleResizeStart}
      />

      {/* Dashboard header */}
      <div className="dashboard-header">
        <div className="dashboard-title">
          <h2>NSM Developer Dashboard</h2>
          <p>Comprehensive developer tools and debugging interface</p>
        </div>
        <div className="dashboard-controls">
          {someServicesUnavailable && (
            <span className="status-indicator status-warning">Some tools unavailable</span>
          )}
          <button
            className="control-btn"
            onClick={handleToggleMinimize}
            title="Minimize Dashboard"
          >
            ─
          </button>
        </div>
      </div>

      {/* Tab navigation */}
      <div
        className={`tab-container ${isMobile ? 'vertical-tabs' : ''}`}
        data-testid="tab-container"
        role="tablist"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab ${layout.activeTab === tab.id ? 'active' : ''}`}
            onClick={() => handleTabClick(tab.id as DashboardTool)}
            role="tab"
            id={`tab-${tab.id}`}
            aria-controls={`panel-${tab.id}`}
            aria-selected={layout.activeTab === tab.id}
            tabIndex={layout.activeTab === tab.id ? 0 : -1}
          >
            <span>{tab.label}</span>
            <span className="tab-shortcut">{tab.shortcut}</span>
          </button>
        ))}
      </div>

      {/* Tool content */}
      <div
        className="tool-content"
        role="tabpanel"
        id={`panel-${layout.activeTab}`}
        aria-labelledby={`tab-${layout.activeTab}`}
      >
        {renderToolContent()}
      </div>

      {/* Keyboard shortcuts panel */}
      <div className="shortcuts-panel">
        <h4>Keyboard Shortcuts</h4>
        <div className="shortcut-list">
          <div className="shortcut-item">
            <span className="shortcut-key">1-5</span>
            <span>Switch tools</span>
          </div>
          <div className="shortcut-item">
            <span className="shortcut-key">Alt+D</span>
            <span>Toggle dashboard</span>
          </div>
          <div className="shortcut-item">
            <span className="shortcut-key">Ctrl+Shift+I</span>
            <span>Inspector</span>
          </div>
          <div className="shortcut-item">
            <span className="shortcut-key">←/→</span>
            <span>Navigate tabs</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeveloperDashboard;