/**
 * TDD TEST: Final Integration Test for Wordle App
 * GREEN PHASE: Verify the fix resolves the original issue
 *
 * ISSUE RESOLVED:
 * - Fixed TypeScript compilation from CommonJS to ESNext modules
 * - Updated package.json to point to correct dist files
 * - Fixed ES module imports with .js extensions
 * - Created minimal index to avoid complex dependency chains
 * - Updated NSMWordleApp.tsx to use @nsm/client package import
 *
 * This test validates that the exact import pattern now used by NSMWordleApp
 * works correctly and provides all required functionality.
 */

import { describe, it, expect } from 'bun:test';

describe('NSMClient Final Integration Test', () => {
  it('should successfully import NSMClient from @nsm/client package', async () => {
    // This is the exact import pattern now used by NSMWordleApp.tsx
    const { NSMClient } = await import('@nsm/client');

    expect(NSMClient).toBeDefined();
    expect(typeof NSMClient).toBe('function');

    // Verify it's a proper constructor
    const instance = new NSMClient({ autoConnect: false });
    expect(instance).toBeInstanceOf(NSMClient);
    expect(instance.constructor.name).toBe('NSMClient');
  });

  it('should provide all methods required by NSMWordleApp', async () => {
    const { NSMClient } = await import('@nsm/client');

    // Test static methods
    expect(typeof NSMClient.isNip07Available).toBe('function');

    // Create instance and test instance methods
    const client = new NSMClient({ autoConnect: false });

    // Methods used directly in NSMWordleApp.tsx
    expect(typeof client.connect).toBe('function');
    expect(typeof client.disconnect).toBe('function');
    expect(typeof client.getUserPublicKey).toBe('function');
    expect(typeof client.requestNip07Permission).toBe('function');
    expect(typeof client.loadApplication).toBe('function');
    expect(typeof client.publishInteraction).toBe('function');
    expect(typeof client.subscribeToApplication).toBe('function');
    expect(typeof client.getConnectedRelays).toBe('function');

    // Verify properties
    expect(Array.isArray(client.relayUrls)).toBe(true);
    expect(client.relayUrls.length).toBeGreaterThan(0);
  });

  it('should create functional NSMClient instance with basic options', async () => {
    const { NSMClient } = await import('@nsm/client');

    // Test the constructor options (avoiding NIP-07 in Node.js environment)
    const client = new NSMClient({
      relayUrls: ['wss://relay.damus.io'],
      autoConnect: false,
    });

    expect(client).toBeInstanceOf(NSMClient);
    expect(client.relayUrls).toEqual(['wss://relay.damus.io']);

    // Test isNip07Available static method (should return false in Node.js)
    expect(typeof NSMClient.isNip07Available()).toBe('boolean');
    expect(NSMClient.isNip07Available()).toBe(false); // No window object in Node.js
  });

  it('should handle permissions and user key methods', async () => {
    const { NSMClient } = await import('@nsm/client');

    const client = new NSMClient({ autoConnect: false });

    // These methods should exist and return expected types
    expect(typeof client.requestNip07Permission).toBe('function');
    expect(typeof client.getUserPublicKey).toBe('function');

    // Test that methods return promises
    const permissionPromise = client.requestNip07Permission();
    const keyPromise = client.getUserPublicKey();

    expect(permissionPromise).toBeInstanceOf(Promise);
    expect(keyPromise).toBeInstanceOf(Promise);

    // These should resolve (to false/null in test environment)
    const [hasPermission, userKey] = await Promise.all([permissionPromise, keyPromise]);
    expect(typeof hasPermission).toBe('boolean');
    expect(userKey === null || typeof userKey === 'string').toBe(true);
  });

  it('should be ready for NSMWordleApp integration without import errors', async () => {
    // This test simulates exactly what happens when the Wordle app loads
    try {
      const { NSMClient } = await import('@nsm/client');

      // Simulate the import - this is the key test
      expect(NSMClient).toBeDefined();
      expect(typeof NSMClient).toBe('function');

      // Simulate the code in NSMWordleApp.tsx constructor call (without NIP-07 in test)
      const client = new NSMClient({
        relayUrls: ['wss://relay.damus.io'],
        autoConnect: false,
      });

      // Simulate the static method call
      const nip07Available = NSMClient.isNip07Available();

      // All should succeed without throwing
      expect(client).toBeDefined();
      expect(typeof nip07Available).toBe('boolean');

      // This test passing means the Wordle app should load successfully
    } catch (error) {
      // If this fails, the Wordle app will still have import issues
      console.error('Integration test failed:', error);
      expect(false).toBe(true); // Force test failure with clear error
    }
  });
});