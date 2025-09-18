/**
 * Dashboard Components Barrel Export
 *
 * Provides clean imports for all dashboard components
 */

// Main container and layout components
export { DashboardContainer } from './DashboardContainer';
export { DashboardHeader } from './DashboardHeader';
export { TabBar } from './TabBar';
export { ToolContent } from './ToolContent';
export { ResizeHandle } from './ResizeHandle';
export { KeyboardShortcutsPanel } from './KeyboardShortcutsPanel';

// Panel components
export { InspectorPanel } from './panels/InspectorPanel';
export { EventLogPanel } from './panels/EventLogPanel';
export { TimeTravelPanel } from './panels/TimeTravelPanel';
export { AppDiscoveryPanel } from './panels/AppDiscoveryPanel';
export { PerformancePanel } from './panels/PerformancePanel';

// Utility components
export { ErrorBoundary } from './ErrorBoundary';

// Types and styles
export type * from './types';
export { dashboardStyles } from './styles';

// Default export for main dashboard
export { default as DeveloperDashboard, ModularDeveloperDashboard } from './ModularDeveloperDashboard';