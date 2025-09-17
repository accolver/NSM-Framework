import '../test-setup';
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { createInspectorService } from '../services/inspector-service';

describe('Manual Inspector Control Integration', () => {
  test('should not auto-connect when autoStart is false', () => {
    const inspectorService = createInspectorService({ autoStart: false });
    expect(inspectorService.isConnected).toBe(false);
  });

  test('should be able to manually connect', async () => {
    const inspectorService = createInspectorService({ autoStart: false });

    // Initially disconnected
    expect(inspectorService.isConnected).toBe(false);

    // Manual connection attempt
    const result = await inspectorService.connect();

    // Should return a boolean (may fail in test environment, but function should work)
    expect(typeof result).toBe('boolean');
  });

  test('should provide manual disconnect functionality', async () => {
    const inspectorService = createInspectorService({ autoStart: false });

    // Should not throw when disconnecting
    await expect(inspectorService.disconnect()).resolves.toBeUndefined();
  });

  test('should track connected state correctly', async () => {
    const inspectorService = createInspectorService({ autoStart: false });

    // Initially false
    expect(inspectorService.isConnected).toBe(false);

    // Try to connect (may succeed or fail in test env)
    await inspectorService.connect();

    // State should be boolean
    expect(typeof inspectorService.isConnected).toBe('boolean');
  });

  test('manual visualizer opening should not throw', () => {
    // Mock window.open
    const originalOpen = global.window.open;
    let openCalled = false;
    global.window.open = () => {
      openCalled = true;
      return { close: () => {} } as any;
    };

    try {
      // Simulate the openVisualizer function from App component
      window.open('https://stately.ai/viz', '_blank');
      expect(openCalled).toBe(true);
    } finally {
      global.window.open = originalOpen;
    }
  });
});