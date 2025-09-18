// NSM Dev Tools - Placeholder tests
import { describe, it, expect } from 'bun:test';
import { NSMDebugger, version } from './index';

describe('NSM Dev Tools', () => {
  describe('Package Info', () => {
    it('should export version', () => {
      expect(version).toBeDefined();
      expect(typeof version).toBe('string');
    });
  });

  describe('NSMDebugger', () => {
    it('should create NSMDebugger instance', () => {
      const debugInstance = new NSMDebugger();
      expect(debugInstance).toBeInstanceOf(NSMDebugger);
    });
  });
});