import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Global vi for all tests
(global as any).vi = vi;

// Mock the NSM client for tests
vi.mock('@nsm/client', () => ({
  NSMClient: class MockNSMClient {
    static isNip07Available() {
      return false;
    }
    async discoverApplications() {
      return [];
    }
    async connect() {
      return;
    }
    disconnect() {
      return;
    }
  }
}));