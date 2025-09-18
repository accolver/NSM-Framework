/**
 * ModularDeveloperDashboard Component
 *
 * Refactored main dashboard that composes all modular components
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type {
  DashboardTool,
  DashboardLayout,
  PerformanceMetrics,
  NSMApplication,
  Tab
} from './types';
import type { EventLogService } from '../../services/event-log-service';
import type { TimeTravelService } from '../../services/time-travel-service';
import type { InspectorService } from '../../services/inspector-service';

// Import modular components
import { DashboardContainer } from './DashboardContainer';
import { DashboardHeader } from './DashboardHeader';
import { TabBar } from './TabBar';
import { ToolContent } from './ToolContent';
import { ResizeHandle } from './ResizeHandle';
import { KeyboardShortcutsPanel } from './KeyboardShortcutsPanel';

/**
 * Developer Dashboard Props
 */
export interface DeveloperDashboardProps {
  eventLogService: EventLogService;
  timeTravelService: TimeTravelService;
  inspectorService: InspectorService;
  connectInspector: () => Promise<void>;
  openVisualizer: () => void;
  className?: string;
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
 * Tab definitions
 */
const TABS: readonly Tab[] = [
  { id: 'inspector', label: 'XState Inspector', shortcut: '1' },
  { id: 'eventlog', label: 'Event Log', shortcut: '2' },
  { id: 'timetravel', label: 'Time Travel', shortcut: '3' },
  { id: 'appdiscovery', label: 'App Discovery', shortcut: '4' },
  { id: 'performance', label: 'Performance', shortcut: '5' }
] as const;

/**
 * Modular Developer Dashboard Component
 *
 * Refactored from monolithic component into composable, reusable pieces
 */
export const ModularDeveloperDashboard: React.FC<DeveloperDashboardProps> = ({
  eventLogService,
  timeTravelService,
  inspectorService,
  connectInspector,
  openVisualizer,
  className = ''
}) => {
  // Layout and UI state
  const [layout, setLayout] = useState<DashboardLayout>(DEFAULT_LAYOUT);
  const [isResizing, setIsResizing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

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

  // Refs for DOM manipulation
  const dashboardRef = useRef<HTMLDivElement>(null);

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

  // Handle responsive design with proper breakpoints
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;

      // Define responsive breakpoints
      const mobile = width < 768;
      const tablet = width >= 768 && width < 1024;
      const desktop = width >= 1024;

      setIsMobile(mobile);
      setIsTablet(tablet);
      setIsDesktop(desktop);

      // Adjust layout width based on breakpoints
      if (mobile) {
        // Mobile: use full width, override any saved width
        setLayout(prev => ({ ...prev, width: window.innerWidth }));
      } else if (tablet) {
        // Tablet: constrain width but keep reasonable size
        const tabletWidth = Math.min(350, width * 0.5);
        setLayout(prev => ({ ...prev, width: Math.max(tabletWidth, prev.width) }));
      } else if (desktop && layout.width < 400) {
        // Desktop: ensure minimum width for full feature access
        setLayout(prev => ({ ...prev, width: Math.max(400, prev.width) }));
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [layout.width]);

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
      if (keyIndex !== -1 && keyIndex < TABS.length) {
        e.preventDefault();
        const tabId = TABS[keyIndex]?.id as DashboardTool;
        saveLayout({ activeTab: tabId });
        return;
      }

      // Arrow navigation within tabs
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const currentIndex = TABS.findIndex(tab => tab.id === layout.activeTab);
        if (currentIndex !== -1) {
          const direction = e.key === 'ArrowLeft' ? -1 : 1;
          const nextIndex = (currentIndex + direction + TABS.length) % TABS.length;
          const nextTabId = TABS[nextIndex]?.id as DashboardTool;
          e.preventDefault();
          saveLayout({ activeTab: nextTabId });
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

  // Handle app connection
  const handleAppConnect = useCallback((appId: string) => {
    // Mock connection toggle
    setDiscoveredApps(prev =>
      prev.map(app => {
        if (app.id === appId) {
          const newStatus = app.status === 'connected' ? 'disconnected' : 'connected';
          return { ...app, status: newStatus };
        }
        return app;
      })
    );
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

  const someServicesUnavailable = !Object.values(serviceAvailable).every(Boolean);

  return (
    <DashboardContainer
      layout={layout}
      isMobile={isMobile}
      isTablet={isTablet}
      isDesktop={isDesktop}
      isResizing={isResizing}
      className={className}
    >
      {/* Resize handle */}
      <ResizeHandle onResizeStart={handleResizeStart} />

      {/* Dashboard header */}
      <DashboardHeader
        onMinimize={handleToggleMinimize}
        showWarning={someServicesUnavailable}
        warningMessage="Some tools unavailable"
      />

      {/* Tab navigation */}
      <TabBar
        tabs={TABS}
        activeTab={layout.activeTab}
        onTabClick={handleTabClick}
      />

      {/* Tool content */}
      <ToolContent
        activeTab={layout.activeTab}
        services={{
          eventLogService,
          timeTravelService,
          inspectorService,
          connectInspector,
          openVisualizer
        }}
        performanceMetrics={performanceMetrics}
        discoveredApps={discoveredApps}
        isScanning={isScanning}
        onAppConnect={handleAppConnect}
      />

      {/* Keyboard shortcuts panel */}
      <KeyboardShortcutsPanel />
    </DashboardContainer>
  );
};

export default ModularDeveloperDashboard;