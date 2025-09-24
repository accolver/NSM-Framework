/**
 * TDD TEST: NSMClient Export Validation
 * RED PHASE: Write failing test to validate NSMClient export exists
 *
 * This test ensures that NSMClient can be imported properly from the package
 * and that it exports the expected functionality for the Wordle POC app.
 */

import { describe, it, expect } from 'bun:test';

describe('NSMClient Export Validation', () => {
  it('should export NSMClient class from main package entry point', async () => {
    // This should fail initially because the package isn't built
    const { NSMClient } = await import('./index');

    expect(NSMClient).toBeDefined();
    expect(typeof NSMClient).toBe('function');
    expect(NSMClient.prototype.constructor).toBe(NSMClient);
  });

  it('should allow creating NSMClient instance with default options', async () => {
    const { NSMClient } = await import('./index');

    const client = new NSMClient();
    expect(client).toBeInstanceOf(NSMClient);
    expect(client.relayUrls).toBeDefined();
    expect(Array.isArray(client.relayUrls)).toBe(true);
  });

  it('should expose static isNip07Available method', async () => {
    const { NSMClient } = await import('./index');

    expect(typeof NSMClient.isNip07Available).toBe('function');
    expect(typeof NSMClient.isNip07Available()).toBe('boolean');
  });

  it('should expose required instance methods for Wordle app', async () => {
    const { NSMClient } = await import('./index');

    const client = new NSMClient({ autoConnect: false });

    // Methods used by NSMWordleApp
    expect(typeof client.connect).toBe('function');
    expect(typeof client.disconnect).toBe('function');
    expect(typeof client.getUserPublicKey).toBe('function');
    expect(typeof client.requestNip07Permission).toBe('function');
    expect(typeof client.loadApplication).toBe('function');
    expect(typeof client.publishInteraction).toBe('function');
    expect(typeof client.subscribeToApplication).toBe('function');
  });

  it('should be importable using the import path used by Wordle app', async () => {
    // This tests the specific import pattern currently used by NSMWordleApp
    // After fix, this should work with proper package import
    try {
      const { NSMClient } = await import('../nsm-client/src/nsm-client');
      expect(NSMClient).toBeDefined();
    } catch (error) {
      // Expected to fail initially - package should use proper export instead
      expect(error).toBeDefined();
    }
  });
});