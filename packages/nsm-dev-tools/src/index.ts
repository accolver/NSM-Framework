// NSM Dev Tools - Development utilities
export const version = '0.1.0';
// Note: @nsm/client-sdk already re-exports @nsm/core, so we don't need to export @nsm/core separately
export * from '@nsm/client-sdk';

// Service factory functions - export these first
export { createEventLogService } from './services/event-log-service.js';
export { createInspectorService } from './services/inspector-service.js';
export { createTimeTravelService } from './services/time-travel-service.js';

// Individual dashboard-related components
export * from './components/CodeViewer.js';
export * from './components/EventLogViewer.js';
export * from './components/StateMachineExporter.js';
export * from './components/TimeTravelDebugger.js';

// Dashboard Components and Services
export * from './dashboard/index.js';

// Convenience exports for common patterns
export { ModularDeveloperDashboard as DeveloperDashboard } from './dashboard/index.js';

// Utilities
export * from './utils/clipboardAPI.js';
export * from './utils/machineSerializer.js';
export * from './utils/machineValidator.js';

// Legacy placeholder - to be removed
export class NSMDebugger {
  constructor() {
    // Placeholder implementation
  }
}
