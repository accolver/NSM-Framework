/**
 * Enhanced NSMClient Example - Task 22 Implementation
 *
 * Demonstrates:
 * - Inline machine configurations (Task 19)
 * - Progressive UI fallback resolution (Task 20)
 * - Blossom implementation loading (Task 21)
 * - MCP-UI to NSM event translation
 * - Application migration utilities
 */

import { NSMClient } from '../client/NSMClient';
import { BlossomClient } from '../blossom/BlossomClient';
import type { INSMDefinitionEvent, NSMDefinitionContent } from '@nsm/core';

// Example usage of enhanced NSMClient
export async function demonstrateEnhancedNSMClient() {
  console.log('=== Enhanced NSMClient Demo - Task 22 ===\n');

  // 1. Create NSMClient with Blossom integration
  const blossomClient = new BlossomClient({
    servers: ['https://cdn.satellite.earth'],
    privateKey: 'dummy-key-for-readonly-access'
  });

  const client = new NSMClient({
    debug: true,
    blossomClient,
    securityContext: {
      allowUnsafeEval: false,
      maxExecutionTime: 5000,
      allowNetworkAccess: false
    },
    offlineMode: false,
    cacheConfig: {
      maxSize: 50,
      ttl: 1800000, // 30 minutes
      persistToDisk: false
    }
  });

  // 2. Example NSM Definition Event with inline and Blossom implementations
  const modernNSMEvent: INSMDefinitionEvent = {
    id: 'event-123',
    pubkey: 'author-pubkey',
    kind: 30079,
    created_at: Math.floor(Date.now() / 1000),
    content: JSON.stringify({
      // Machine configuration (inline)
      machineConfig: {
        id: 'modern-counter-app',
        initial: 'idle',
        version: 'v5', // XState v5 with setup() pattern
        context: {
          count: 0,
          maxCount: 10,
          lastAction: null
        },
        states: {
          idle: {
            on: {
              START: {
                target: 'active',
                actions: ['logStart', 'initializeTimer']
              }
            }
          },
          active: {
            on: {
              INCREMENT: {
                guard: 'canIncrement',
                actions: ['increment', 'logAction'],
                target: 'active'
              },
              DECREMENT: {
                guard: 'canDecrement',
                actions: ['decrement', 'logAction'],
                target: 'active'
              },
              RESET: {
                actions: ['reset', 'logAction'],
                target: 'idle'
              }
            }
          }
        },
        setup: {
          // Mixed inline and Blossom implementations
          actions: {
            // Inline implementations
            increment: '(context, event) => ({ count: context.count + 1, lastAction: "increment" })',
            decrement: '(context, event) => ({ count: context.count - 1, lastAction: "decrement" })',
            reset: '(context, event) => ({ count: 0, lastAction: "reset" })',
            logAction: '(context, event) => { console.log("Action:", event.type, "Count:", context.count); }',

            // Blossom references (would be loaded from external storage)
            logStart: 'ref:blossom:sha256:abc123456789',
            initializeTimer: 'ref:blossom:sha256:def123456789'
          },
          guards: {
            // Inline guards
            canIncrement: '(context) => context.count < context.maxCount',
            canDecrement: '(context) => context.count > 0'
          }
        }
      },
      // Required schemas for NSMDefinitionContent
      stateSchema: {
        type: 'object',
        properties: {
          count: { type: 'number' },
          maxCount: { type: 'number' },
          lastAction: {
            type: 'string',
            enum: ['increment', 'decrement', 'reset']
          }
        }
      },
      interactionSchema: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['INCREMENT', 'DECREMENT', 'RESET', 'START']
          }
        },
        required: ['type']
      },
      // Blossom implementation reference
      implementations: {
        hash: 'abc123def456789',
        uri: 'blossom://cdn.satellite.earth/abc123def456789',
        contentType: 'application/x-nsm-implementation',
        size: 2048,
        integrity: {
          algorithm: 'sha256',
          hash: 'abc123def456789',
          verifiedAt: Date.now()
        },
        metadata: {
          functions: ['logStart', 'initializeTimer'],
          version: '1.0.0',
          dependencies: ['console']
        }
      }
    } as NSMDefinitionContent),
    tags: [
      ['d', 'modern-counter-app'],
      ['name', 'Modern Counter Application'],
      ['engine', 'xstate@5.17.0'],
      ['engineCodeURI', 'blossom://cdn.satellite.earth/xstate-v5'],
      ['version', '2.0.0'],
      ['description', 'A modern counter app with mixed implementations'],
      ['ui-fallbacks', JSON.stringify([
        {
          type: 'mcp-ui',
          spec: {
            endpoints: ['ui://localhost:3000/counter-app'],
            capabilities: ['remote-dom', 'event-streaming']
          }
        },
        {
          type: 'web-components',
          spec: {
            componentName: 'nsm-counter-app',
            modulePath: 'https://cdn.example.com/counter-component.js',
            tagName: 'nsm-counter'
          }
        },
        {
          type: 'json-ui',
          schema: {
            title: 'Counter Application',
            description: 'Simple counter with increment/decrement',
            components: [
              {
                type: 'container',
                layout: 'vertical',
                children: [
                  { type: 'label', text: 'Count: 0', id: 'counter-display' },
                  { type: 'button', text: 'Increment', event: 'INCREMENT', id: 'inc-btn' },
                  { type: 'button', text: 'Decrement', event: 'DECREMENT', id: 'dec-btn' },
                  { type: 'button', text: 'Reset', event: 'RESET', id: 'reset-btn' }
                ]
              }
            ]
          }
        }
      ])]
    ],
    sig: 'signature-hash'
  };

  // 3. Parse machine configuration with mixed implementations
  console.log('1. Parsing machine configuration...');
  const parseResult = await client.parseMachineConfiguration(modernNSMEvent);

  if (parseResult.success) {
    console.log('✅ Machine configuration parsed successfully');
    console.log(`   Version: ${parseResult.config?.version}`);
    console.log(`   Inline actions: ${Object.keys(parseResult.implementations?.inline.actions || {}).length}`);
    console.log(`   Blossom functions: ${parseResult.implementations?.blossom.metadata.functionCount || 0}`);

    if (parseResult.warnings) {
      console.log(`   Warnings: ${parseResult.warnings.length}`);
      parseResult.warnings.forEach(warning => console.log(`   ⚠️  ${warning}`));
    }
  } else {
    console.log('❌ Failed to parse machine configuration');
    console.log(`   Error: ${parseResult.error}`);
    return;
  }

  // 4. Demonstrate UI rendering with progressive fallback
  console.log('\n2. Demonstrating UI rendering...');
  const container = document.createElement('div');
  container.id = 'nsm-app-container';

  const uiResult = await client.renderUI(modernNSMEvent, container, (eventType: string, data: any) => {
    console.log('🔄 UI Interaction:', eventType, data);

    // Convert UI event to NSM interaction
    const nsmEvent = client.translateMCPUIIntent({
      type: eventType,
      target: data.componentId,
      data: data
    }, 'modern-counter-app');

    console.log('📤 NSM Event:', nsmEvent);
  });

  if (uiResult.success) {
    console.log(`✅ UI rendered successfully with ${uiResult.renderer}`);
    console.log(`   Current renderer: ${client.getCurrentRenderer()}`);
  } else {
    console.log('❌ Failed to render UI');
    console.log(`   Error: ${uiResult.error}`);
  }

  // 5. Demonstrate MCP-UI to NSM event translation
  console.log('\n3. Testing MCP-UI event translation...');

  const mcpIntent = {
    type: 'button-click',
    target: 'increment-button',
    data: {
      buttonId: 'inc-btn',
      timestamp: Date.now(),
      coordinates: { x: 100, y: 200 }
    }
  };

  const translatedEvent = client.translateMCPUIIntent(mcpIntent, 'modern-counter-app');
  console.log('🔄 MCP Intent → NSM Event:');
  console.log(`   Type: ${translatedEvent.type}`);
  console.log(`   App: ${translatedEvent.applicationId}`);
  console.log(`   Interaction: ${translatedEvent.interactionType}`);
  console.log(`   Target: ${translatedEvent.targetElement}`);

  // 6. Demonstrate Remote DOM processing
  console.log('\n4. Processing Remote DOM messages...');

  const remoteDOMMessage = {
    type: 'DOM_UPDATE',
    path: ['#counter-display'],
    operation: 'textContent',
    value: 'Count: 5'
  };

  const domEvent = client.processRemoteDOMMessage(remoteDOMMessage, 'modern-counter-app');
  console.log('🖥️  Remote DOM → NSM Event:');
  console.log(`   Type: ${domEvent.type}`);
  console.log(`   App: ${domEvent.applicationId}`);
  console.log(`   DOM Update: ${JSON.stringify(domEvent.domUpdate, null, 2)}`);

  // 7. Demonstrate v4 to v5 migration
  console.log('\n5. Testing v4 to v5 migration...');

  const legacyV4Config = {
    id: 'legacy-app',
    initial: 'idle',
    context: { value: 0 },
    states: {
      idle: {
        on: { START: 'active' }
      },
      active: {
        on: {
          UPDATE: {
            actions: 'updateValue'
          }
        }
      }
    },
    options: {
      actions: {
        updateValue: (context: any, event: any) => ({ value: event.data.newValue }),
        logUpdate: (context: any) => console.log('Value updated:', context.value)
      },
      guards: {
        isValid: (context: any, event: any) => event.data.newValue > 0
      }
    }
  };

  const migrationResult = client.migrateV4ToV5(legacyV4Config);

  if (migrationResult.success) {
    console.log('✅ v4 configuration migrated to v5');
    console.log(`   New version: ${migrationResult.config?.version}`);
    console.log(`   Actions migrated: ${Object.keys(migrationResult.config?.setup?.actions || {}).length}`);
    console.log(`   Guards migrated: ${Object.keys(migrationResult.config?.setup?.guards || {}).length}`);

    if (migrationResult.warnings.length > 0) {
      console.log(`   Migration warnings: ${migrationResult.warnings.length}`);
      migrationResult.warnings.forEach(warning => console.log(`   ⚠️  ${warning}`));
    }
  } else {
    console.log('❌ Migration failed');
    migrationResult.errors?.forEach(error => console.log(`   ❌ ${error}`));
  }

  // 8. Validate hybrid configuration
  console.log('\n6. Validating hybrid configuration...');

  const hybridConfig = {
    id: 'hybrid-app',
    initial: 'start',
    version: 'v5',
    states: { start: {}, active: {} },
    setup: {
      actions: {
        modernAction: '(context, event) => ({ ...context, modern: true })'
      }
    },
    // Legacy v4 pattern (should warn)
    options: {
      actions: {
        legacyAction: (context: any) => ({ ...context, legacy: true })
      }
    }
  };

  const validationResult = client.validateHybridConfiguration(hybridConfig);
  console.log(`✅ Hybrid configuration validation: ${validationResult.isValid ? 'VALID' : 'INVALID'}`);
  console.log(`   Warnings: ${validationResult.warnings.length}`);
  validationResult.warnings.forEach(warning => console.log(`   ⚠️  ${warning}`));

  if (validationResult.errors.length > 0) {
    console.log(`   Errors: ${validationResult.errors.length}`);
    validationResult.errors.forEach(error => console.log(`   ❌ ${error}`));
  }

  // 9. Cleanup
  console.log('\n7. Cleaning up...');
  client.cleanupUI();
  console.log('✅ Cleanup completed');

  console.log('\n=== Enhanced NSMClient Demo Complete ===');
}

// Legacy v4 configuration example for migration testing
export const legacyV4Example = {
  id: 'legacy-counter',
  initial: 'idle',
  context: { count: 0 },
  states: {
    idle: {
      on: { START: 'counting' }
    },
    counting: {
      on: {
        INCREMENT: {
          target: 'counting',
          actions: 'increment'
        },
        DECREMENT: {
          target: 'counting',
          actions: 'decrement'
        }
      }
    }
  },
  options: {
    actions: {
      increment: (context: any) => ({ count: context.count + 1 }),
      decrement: (context: any) => ({ count: context.count - 1 })
    },
    services: {
      countdownService: (context: any) => {
        return new Promise(resolve => {
          setTimeout(() => resolve('done'), 1000);
        });
      }
    }
  }
};

// Modern v5 configuration example
export const modernV5Example = {
  id: 'modern-counter',
  initial: 'idle',
  version: 'v5',
  context: {
    count: 0,
    history: []
  },
  states: {
    idle: {
      on: { START: 'counting' }
    },
    counting: {
      on: {
        INCREMENT: {
          guard: 'canIncrement',
          actions: ['increment', 'recordHistory']
        },
        DECREMENT: {
          guard: 'canDecrement',
          actions: ['decrement', 'recordHistory']
        }
      }
    }
  },
  setup: {
    actions: {
      increment: '(context, event) => ({ count: context.count + 1 })',
      decrement: '(context, event) => ({ count: context.count - 1 })',
      recordHistory: '(context, event) => ({ history: [...context.history, { action: event.type, timestamp: Date.now() }] })'
    },
    guards: {
      canIncrement: '(context) => context.count < 100',
      canDecrement: '(context) => context.count > 0'
    },
    actors: {
      countdownActor: 'ref:blossom:sha256:countdown-implementation'
    }
  }
};

// Export for use in applications
export { NSMClient };