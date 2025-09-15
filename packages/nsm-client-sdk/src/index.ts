// NSM Client SDK - Main SDK for building NSM applications
import { version } from '../package.json';
import { NSMEvent } from '@nsm/core';

export { version };
export * from '@nsm/core';

// Blossom Protocol Integration (Task 4)
export * from './blossom';

// Placeholder SDK class - will be implemented in Task 3
export class NSMClient {
  constructor() {
    // Placeholder implementation
  }

  async initialize(): Promise<void> {
    // Placeholder - will be implemented later
  }
}