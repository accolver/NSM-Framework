// NSM Dev Tools - Development utilities
import { version } from '../package.json';

export { version };
// Note: @nsm/client-sdk already re-exports @nsm/core, so we don't need to export @nsm/core separately
export * from '@nsm/client-sdk';

// Dashboard Components and Services
export * from './dashboard';
export * from './services/event-log-service';
export * from './services/time-travel-service';
export * from './services/inspector-service';

// Individual dashboard-related components
export * from './components/EventLogViewer';
export * from './components/TimeTravelDebugger';
export * from './components/StateMachineExporter';
export * from './components/CodeViewer';

// Convenience exports for common patterns
export { ModularDeveloperDashboard as DeveloperDashboard } from './dashboard';

// Service factory functions
export { createEventLogService } from './services/event-log-service';
export { createTimeTravelService } from './services/time-travel-service';
export { createInspectorService } from './services/inspector-service';

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