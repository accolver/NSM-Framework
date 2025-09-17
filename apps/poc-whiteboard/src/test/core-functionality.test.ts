import { describe, test, expect } from 'bun:test';

describe('Core Whiteboard Functionality', () => {
  test('should be able to import and create services without hanging', async () => {
    // Test that all core services can be imported and created
    const { createEventLogService } = await import('../services/event-log-service');
    const { createTimeTravelService } = await import('../services/time-travel-service');
    const { createInspectorService } = await import('../services/inspector-service');

    // Create services - should not hang
    const eventLogService = createEventLogService({
      maxEvents: 10,
      enableRealtime: false,
      autoStart: false
    });

    const timeTravelService = createTimeTravelService({
      maxSnapshots: 10,
      enableRealtime: false,
      devOnly: false
    });

    const inspectorService = createInspectorService({
      autoStart: false,
      devOnly: false
    });

    // Verify services are created
    expect(eventLogService).toBeDefined();
    expect(timeTravelService).toBeDefined();
    expect(inspectorService).toBeDefined();

    // Verify core methods exist
    expect(typeof eventLogService.start).toBe('function');
    expect(typeof eventLogService.getEvents).toBe('function');
    expect(typeof eventLogService.getEventCount).toBe('function');

    expect(typeof timeTravelService.connect).toBe('function');
    expect(typeof timeTravelService.disconnect).toBe('function');

    expect(typeof inspectorService.connect).toBe('function');
    expect(typeof inspectorService.disconnect).toBe('function');

    // Clean up
    eventLogService.stop();
    timeTravelService.disconnect();
    inspectorService.disconnect();
  });

  test('should be able to import whiteboard machine without hanging', async () => {
    // This was the original hanging issue - importing the machine
    const { whiteboardMachine } = await import('../whiteboard-machine');

    expect(whiteboardMachine).toBeDefined();
    expect(whiteboardMachine.config).toBeDefined();
    expect(whiteboardMachine.id).toBeDefined();
  });

  test('should handle NSM protocol constants', async () => {
    // Verify NSM protocol integration works
    const { NSM_PROTOCOL } = await import('@nsm/core');

    expect(NSM_PROTOCOL.DEFINITION_KIND).toBeDefined();
    expect(NSM_PROTOCOL.STATE_UPDATE_KIND).toBeDefined();
    expect(typeof NSM_PROTOCOL.DEFINITION_KIND).toBe('number');
    expect(typeof NSM_PROTOCOL.STATE_UPDATE_KIND).toBe('number');
  });

  test('should be able to create mock events for testing', () => {
    // Test the event creation functionality
    const createMockEvent = () => ({
      id: 'test-id',
      pubkey: 'test-pubkey',
      created_at: Math.floor(Date.now() / 1000),
      kind: 1001,
      tags: [],
      content: 'test content',
      sig: 'test-signature'
    });

    const event = createMockEvent();
    expect(event).toBeDefined();
    expect(event.id).toBe('test-id');
    expect(event.content).toBe('test content');
    expect(typeof event.created_at).toBe('number');
  });
});