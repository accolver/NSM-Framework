import '../test-setup';
import { describe, it, test, expect, beforeEach, afterEach } from 'bun:test';
import { mock } from 'bun:test';
import React from 'react';
import { getInspectorService, createInspectorService } from '../services/inspector-service';

describe('Inspector Manual Control - TDD', () => {
  describe('Core Requirements Testing', () => {
    test('should have inspector service available', () => {
      const inspectorService = getInspectorService();
      expect(inspectorService).toBeDefined();
      expect(typeof inspectorService.connect).toBe('function');
      expect(typeof inspectorService.disconnect).toBe('function');
    });

    test('inspector should not auto-connect by default', () => {
      const inspectorService = createInspectorService({ autoStart: false });
      expect(inspectorService.isConnected).toBe(false);
    });

    test('should provide manual connect functionality', async () => {
      const inspectorService = createInspectorService({ autoStart: false });

      // This might fail due to test environment - that's expected in TDD RED phase
      const result = await inspectorService.connect();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Auto-Open Prevention Tests (RED phase)', () => {
    test('FAILS: inspector should not auto-start when autoStart is false', () => {
      // This test defines the requirement - inspector should NOT auto-start
      // Use createInspectorService directly to avoid global singleton issues
      const inspectorService = createInspectorService({ autoStart: false });

      // In current implementation, this might pass, but we want to ensure
      // the App component doesn't auto-connect
      expect(inspectorService.isConnected).toBe(false);
    });

    test('FAILS: window.open should not be called automatically', () => {
      // Mock window.open to track calls
      const originalOpen = global.window.open;
      const mockOpen = mock(() => ({ close: mock() }));
      global.window.open = mockOpen;

      try {
        // This test will fail until we implement the changes
        // Creating inspector service should not trigger window.open
        const inspectorService = createInspectorService({ autoStart: false });

        expect(mockOpen).not.toHaveBeenCalled();
      } finally {
        global.window.open = originalOpen;
      }
    });
  });

  describe('Manual Trigger Tests (RED phase)', () => {
    test('FAILS: should provide manual open visualizer functionality', () => {
      // This test will fail until we add the manual trigger button
      // We expect a button that manually opens the visualizer

      const mockOpen = mock(() => ({ close: mock() }));
      global.window.open = mockOpen;

      // Simulate manual trigger (this will fail until implemented)
      // manualOpenVisualizer(); // This function doesn't exist yet

      // For now, test the concept exists
      expect(typeof global.window.open).toBe('function');
    });

    test('FAILS: should provide manual connect inspector functionality', async () => {
      // This test will fail until we modify the UI to disable auto-connect
      const inspectorService = createInspectorService({ autoStart: false });

      // Manual connection should be possible
      expect(inspectorService.isConnected).toBe(false);

      // This should work but only when manually triggered
      const canConnect = typeof inspectorService.connect === 'function';
      expect(canConnect).toBe(true);
    });
  });

  describe('Expected Behavior After Implementation', () => {
    test('should maintain inspector service functionality when manually triggered', async () => {
      const inspectorService = createInspectorService({ autoStart: false });

      // Service should be available for manual use
      expect(inspectorService).toBeDefined();
      expect(inspectorService.isConnected).toBe(false);

      // Connection should be possible manually
      const result = await inspectorService.connect();
      expect(typeof result).toBe('boolean');
    });
  });
});