/**
 * Dashboard Component Types
 *
 * Shared types for all dashboard components following React best practices
 */

import type { EventLogService } from '../services/event-log-service';
import type { TimeTravelService } from '../services/time-travel-service';
import type { InspectorService } from '../services/inspector-service';

/**
 * Available dashboard tools
 */
export type DashboardTool = 'inspector' | 'eventlog' | 'timetravel' | 'appdiscovery' | 'performance';

/**
 * Layout configuration for the dashboard
 */
export interface DashboardLayout {
  width: number;
  activeTab: DashboardTool;
  isMinimized: boolean;
  tabOrder: DashboardTool[];
}

/**
 * Dashboard performance metrics interface
 */
export interface DashboardPerformanceMetrics {
  memoryUsage: number;
  eventCount: number;
  networkActivity: number;
  lastUpdated: number;
}

/**
 * NSM application for discovery
 */
export interface NSMApplication {
  id: string;
  name: string;
  type: string;
  status: 'connected' | 'disconnected' | 'connecting' | 'discovering';
  url?: string;
  lastSeen: number;
}

/**
 * Tab definition interface
 */
export interface Tab {
  id: DashboardTool;
  label: string;
  shortcut: string;
}

/**
 * Base component props interface
 */
export interface BaseComponentProps {
  className?: string;
}

/**
 * Main dashboard services
 */
export interface DashboardServices {
  eventLogService: EventLogService;
  timeTravelService: TimeTravelService;
  inspectorService: InspectorService;
  connectInspector: () => Promise<void>;
  openVisualizer: () => void;
}

/**
 * Tab bar component props
 */
export interface TabBarProps extends BaseComponentProps {
  tabs: readonly Tab[];
  activeTab: DashboardTool;
  onTabClick: (tabId: DashboardTool) => void;
  isHorizontalScroll?: boolean;
}

/**
 * Dashboard header props
 */
export interface DashboardHeaderProps extends BaseComponentProps {
  title?: string;
  subtitle?: string;
  onMinimize?: () => void;
  showMinimizeButton?: boolean;
  showWarning?: boolean;
  warningMessage?: string;
}

/**
 * Resize handle props
 */
export interface ResizeHandleProps extends BaseComponentProps {
  onResizeStart: (e: React.MouseEvent) => void;
}

/**
 * Inspector panel props
 */
export interface InspectorPanelProps extends BaseComponentProps {
  inspectorService: InspectorService;
  connectInspector: () => Promise<void>;
  openVisualizer: () => void;
}

/**
 * Event log panel props
 */
export interface EventLogPanelProps extends BaseComponentProps {
  eventLogService: EventLogService;
}

/**
 * Time travel panel props
 */
export interface TimeTravelPanelProps extends BaseComponentProps {
  timeTravelService: TimeTravelService;
}

/**
 * App discovery panel props
 */
export interface AppDiscoveryPanelProps extends BaseComponentProps {
  discoveredApps: NSMApplication[];
  isScanning: boolean;
  onAppConnect?: (appId: string) => void;
}

/**
 * Performance panel props
 */
export interface PerformancePanelProps extends BaseComponentProps {
  performanceMetrics: DashboardPerformanceMetrics;
}

/**
 * Tool content area props
 */
export interface ToolContentProps extends BaseComponentProps {
  activeTab: DashboardTool;
  services: DashboardServices;
  performanceMetrics: DashboardPerformanceMetrics;
  discoveredApps: NSMApplication[];
  isScanning: boolean;
  onAppConnect?: (appId: string) => void;
}

/**
 * Keyboard shortcuts panel props
 */
export interface KeyboardShortcutsPanelProps extends BaseComponentProps {
  shortcuts?: Array<{
    key: string;
    description: string;
  }>;
}

/**
 * Error boundary props
 */
export interface ErrorBoundaryProps extends BaseComponentProps {
  children: React.ReactNode;
  toolName: string;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

/**
 * Dashboard container props
 */
export interface DashboardContainerProps extends BaseComponentProps {
  layout: DashboardLayout;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isResizing?: boolean;
  children: React.ReactNode;
}