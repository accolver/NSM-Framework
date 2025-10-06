// NSM Dev Tools - Development utilities
import { version } from '../package.json';

export { version };
// Note: @nsm/client-sdk already re-exports @nsm/core, so we don't need to export @nsm/core separately
export * from '@nsm/client-sdk';

// Dashboard Components and Services
export * from './dashboard/index.js';
export * from './services/event-log-service.js';
export * from './services/time-travel-service.js';
export * from './services/inspector-service.js';

// Individual dashboard-related components
export * from './components/EventLogViewer.js';
export * from './components/TimeTravelDebugger.js';
export * from './components/StateMachineExporter.js';
export * from './components/CodeViewer.js';

// Convenience exports for common patterns
export { ModularDeveloperDashboard as DeveloperDashboard } from './dashboard/index.js';

// Service factory functions
export { createEventLogService } from './services/event-log-service.js';
export { createTimeTravelService } from './services/time-travel-service.js';
export { createInspectorService } from './services/inspector-service.js';

// Utilities
export * from './utils/machineSerializer.js';
export * from './utils/machineValidator.js';
export * from './utils/clipboardAPI.js';

// Legacy placeholder - to be removed
export class NSMDebugger {
  constructor() {
    // Placeholder implementation
  }
}