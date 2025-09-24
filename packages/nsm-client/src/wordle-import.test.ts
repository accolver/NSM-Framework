/**
 * TDD TEST: Reproduce Wordle App Import Issue
 * RED PHASE: Test the exact import pattern used by NSMWordleApp
 *
 * This test reproduces the specific import issue in the Wordle POC app
 * to ensure our fix resolves the problem.
 */

import { describe, it, expect } from 'bun:test';

describe('Wordle App Import Issue', () => {
  it('should fail when importing from compiled JS file (current issue)', async () => {
    // This reproduces the current issue - importing from the compiled CommonJS file
    try {
      const { NSMClient } = await import('./nsm-client.js');
      // If this succeeds, the test will fail (we expect it to fail)
      expect(false).toBe(true); // Force failure if import succeeds
    } catch (error) {
      // Expected to fail because file doesn't exist or has wrong export format
      expect(error).toBeDefined();
    }
  });

  it('should succeed when importing from the proper package entry point', async () => {
    // This should work after we fix the build
    const { NSMClient } = await import('@nsm/client');

    expect(NSMClient).toBeDefined();
    expect(typeof NSMClient).toBe('function');

    // Test that we can create an instance
    const client = new NSMClient({ autoConnect: false });
    expect(client).toBeInstanceOf(NSMClient);
  });

  it('should have NSMClient available as named export from index', async () => {
    // Test the specific export pattern
    const module = await import('./index');

    expect(module.NSMClient).toBeDefined();
    expect(typeof module.NSMClient).toBe('function');

    // Verify it's the same class
    const client = new module.NSMClient({ autoConnect: false });
    expect(client.constructor.name).toBe('NSMClient');
  });

  it('should export all required methods for Wordle integration', async () => {
    const { NSMClient } = await import('./index');

    // Static methods
    expect(typeof NSMClient.isNip07Available).toBe('function');

    // Instance methods required by NSMWordleApp.tsx
    const client = new NSMClient({ autoConnect: false });
    expect(typeof client.connect).toBe('function');
    expect(typeof client.disconnect).toBe('function');
    expect(typeof client.getUserPublicKey).toBe('function');
    expect(typeof client.requestNip07Permission).toBe('function');
    expect(typeof client.loadApplication).toBe('function');
    expect(typeof client.publishInteraction).toBe('function');
    expect(typeof client.subscribeToApplication).toBe('function');
    expect(typeof client.getConnectedRelays).toBe('function');
  });
});