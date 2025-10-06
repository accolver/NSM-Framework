// NSM Dev Tools - Development utilities
import { version } from '../package.json';

export { version };
// Note: @nsm/client-sdk already re-exports @nsm/core, so we don't need to export @nsm/core separately
export * from '@nsm/client-sdk';

// Service factory functions - export these first
export { createEventLogService } from './services/event-log-service';
export { createTimeTravelService } from './services/time-travel-service';
export { createInspectorService } from './services/inspector-service';

// Individual dashboard-related components
export * from './components/EventLogViewer';
export * from './components/TimeTravelDebugger';
export * from './components/StateMachineExporter';
export * from './components/CodeViewer';

// Dashboard Components and Services
export * from './dashboard';

// Convenience exports for common patterns
export { ModularDeveloperDashboard as DeveloperDashboard } from './dashboard';

// Utilities
export * from './utils/machineSerializer';
export * from './utils/machineValidator';
export * from './utils/clipboardAPI';

// Legacy placeholder - to be removed
export class NSMDebugger {
  constructor() {
    // Placeholder implementation
  }
}