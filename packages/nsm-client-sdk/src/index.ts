// NSM Client SDK - Enhanced SDK for building NSM applications (Task 22)
import { version } from '../package.json';

export { version };
export * from '@nsm/core';

// Blossom Protocol Integration (Task 21)
export * from './blossom';

// Progressive UI Fallback System (Task 20)
export * from './ui/ui-resolver';
export * from './ui/mcp-ui-renderer';
export * from './ui/web-components-renderer';
export * from './ui/json-ui-renderer';

// Enhanced NSM Client (Task 22)
export {
  NSMClient,
  type NSMClientOptions,
  type MachineParseResult,
  type UIRenderResult,
  type NSMUIInteractionEvent,
  type NSMDOMUpdateEvent,
  type MigrationResult,
  type ValidationResult
} from './client/NSMClient';

// Legacy compatibility exports
import { NSMClient } from './client/NSMClient';
export default NSMClient;