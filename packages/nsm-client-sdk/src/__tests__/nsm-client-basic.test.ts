import { describe, it, expect } from 'bun:test';
import { NSMClient } from '../client/NSMClient';
import type { INSMDefinitionEvent, NSMDefinitionContent } from '@nsm/core';

describe('NSMClient Basic Integration', () => {
  const mockDefinitionEvent: INSMDefinitionEvent = {
    id: 'test-event-id',
    pubkey: 'test-pubkey',
    kind: 30079,
    created_at: Math.floor(Date.now() / 1000),
    content: JSON.stringify({
      machineConfig: {
        id: 'test-app',
        initial: 'idle',
        version: 'v5',
        context: { count: 0 },
        states: {
          idle: {
            on: {
              START: { target: 'running' }
            }
          },
          running: {
            on: {
              STOP: { target: 'idle' }
            }
          }
        },
        setup: {
          actions: {
            increment: '(ctx) => ({ count: ctx.count + 1 })',
            decrement: '(ctx) => ({ count: ctx.count - 1 })'
          },
          guards: {
            canIncrement: '(ctx) => ctx.count < 10',
            isPositive: '(ctx) => ctx.count > 0'
          }
        }
      },
      stateSchema: {
        type: 'object',
        properties: {
          count: { type: 'number' }
        }
      },
      interactionSchema: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['START', 'STOP']
          }
        }
      }
    } as NSMDefinitionContent),
    tags: [
      ['d', 'test-app'],
      ['name', 'Test Application'],
      ['engine', 'xstate@5'],
      ['engineCodeURI', 'blossom://test-server/xstate-v5'],
      ['ui-fallbacks', JSON.stringify([
        { type: 'json-ui', schema: { title: 'Test App', components: [] } }
      ])]
    ],
    sig: 'test-signature'
  };

  it('should create NSMClient instance', () => {
    const client = new NSMClient();
    expect(client).toBeDefined();
    expect(client.getCurrentRenderer()).toBe(null);
  });

  it('should create NSMClient with options', () => {
    const client = new NSMClient({
      debug: true,
      offlineMode: true
    });
    expect(client).toBeDefined();
  });

  it('should parse machine configuration successfully', async () => {
    const client = new NSMClient({ debug: true, offlineMode: true });
    const result = await client.parseMachineConfiguration(mockDefinitionEvent);

    expect(result.success).toBe(true);
    expect(result.config).toBeDefined();
    expect(result.config?.id).toBe('test-app');
    expect(result.config?.version).toBe('v5');
    expect(result.config?.setup).toBeDefined();
  });

  it('should handle invalid machine configuration', async () => {
    const client = new NSMClient({ debug: true, offlineMode: true });
    const invalidEvent = {
      ...mockDefinitionEvent,
      content: JSON.stringify({ machineConfig: { id: 'invalid' } }) // Missing required fields
    };

    const result = await client.parseMachineConfiguration(invalidEvent);

    expect(result.success).toBe(false);
    expect(result.error).toContain('missing required fields');
  });

  it('should translate MCP-UI intents to NSM events', () => {
    const client = new NSMClient();
    const mcpIntent = {
      type: 'button-click',
      target: 'increment-btn',
      data: { value: 1 }
    };

    const nsmEvent = client.translateMCPUIIntent(mcpIntent, 'test-app');

    expect(nsmEvent.type).toBe('NSM_UI_INTERACTION');
    expect(nsmEvent.applicationId).toBe('test-app');
    expect(nsmEvent.interactionType).toBe('button-click');
    expect(nsmEvent.targetElement).toBe('increment-btn');
    expect(nsmEvent.data.value).toBe(1);
    expect(nsmEvent.timestamp).toBeTypeOf('number');
  });

  it('should process Remote DOM messages', () => {
    const client = new NSMClient();
    const remoteDOMMessage = {
      type: 'DOM_UPDATE',
      path: ['#app', '.counter'],
      operation: 'textContent',
      value: '5'
    };

    const result = client.processRemoteDOMMessage(remoteDOMMessage, 'test-app');

    expect(result.type).toBe('NSM_DOM_UPDATE');
    expect(result.applicationId).toBe('test-app');
    expect(result.domUpdate.type).toBe('DOM_UPDATE');
    expect(result.domUpdate.path).toEqual(['#app', '.counter']);
    expect(result.domUpdate.operation).toBe('textContent');
    expect(result.domUpdate.value).toBe('5');
  });

  it('should migrate v4 configuration to v5', () => {
    const client = new NSMClient();
    const v4Config = {
      id: 'legacy-app',
      initial: 'idle',
      context: { count: 0 },
      states: {
        idle: {
          on: {
            INCREMENT: {
              target: 'idle',
              actions: 'increment'
            }
          }
        }
      },
      options: {
        actions: {
          increment: '(ctx) => ({ count: ctx.count + 1 })'
        }
      }
    };

    const result = client.migrateV4ToV5(v4Config);

    expect(result.success).toBe(true);
    expect(result.config?.version).toBe('v5');
    expect(result.config?.setup?.actions).toBeDefined();
    expect(result.config?.setup?.actions?.increment).toBeDefined();
    expect(Array.isArray(result.warnings)).toBe(true);
  });

  it('should validate hybrid configuration', () => {
    const client = new NSMClient();
    const hybridConfig = {
      id: 'hybrid-app',
      initial: 'idle',
      version: 'v5',
      states: { idle: {} },
      setup: {
        actions: {
          newAction: '(ctx) => ({ ...ctx, updated: true })'
        }
      },
      // Legacy v4 options should still work but warn
      options: {
        actions: {
          legacyAction: '(ctx) => ({ ...ctx, legacy: true })'
        }
      }
    };

    const result = client.validateHybridConfiguration(hybridConfig);

    expect(result.isValid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings.some(w => w.includes('options'))).toBe(true);
  });

  it('should clean up UI renderer', () => {
    const client = new NSMClient();
    client.cleanupUI();
    expect(client.getCurrentRenderer()).toBe(null);
  });
});