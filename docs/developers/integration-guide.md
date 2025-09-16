# NSM Protocol Integration Guide

## Overview

This comprehensive guide helps developers integrate NSM (Nostr State Machines) protocol into their applications, whether they're building new Nostr applications or adding state management to existing ones.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture Overview](#architecture-overview)
3. [Integration Patterns](#integration-patterns)
4. [Implementation Examples](#implementation-examples)
5. [Migration Strategies](#migration-strategies)
6. [Performance Optimization](#performance-optimization)
7. [Testing and Validation](#testing-and-validation)
8. [Troubleshooting](#troubleshooting)

## Quick Start

### Prerequisites

- Basic understanding of Nostr protocol
- Familiarity with your chosen programming language
- Access to Nostr relays
- cryptographic key pair for signing events

### 5-Minute Setup

#### 1. Choose Your Implementation

**TypeScript/JavaScript**:
```bash
npm install @nsm/core nostr-tools
```

**Python**:
```bash
pip install python-nostr jsonschema
```

**Go**:
```bash
go get github.com/nbd-wtf/go-nostr
```

#### 2. Basic Counter Application

**TypeScript Example**:
```typescript
import { NSMClient, NSMDefinition } from '@nsm/core';
import { getPublicKey, getEventHash, signEvent } from 'nostr-tools';

// 1. Define your state machine
const counterDefinition: NSMDefinition = {
  initialState: { count: 0 },
  stateSchema: {
    type: 'object',
    properties: {
      count: { type: 'number' }
    },
    required: ['count']
  },
  interactionSchema: {
    type: 'object',
    properties: {
      type: { type: 'string', enum: ['INCREMENT', 'DECREMENT'] }
    },
    required: ['type']
  }
};

// 2. Initialize NSM client
const client = new NSMClient({
  privateKey: process.env.NOSTR_PRIVATE_KEY,
  relays: ['wss://relay.damus.io', 'wss://nos.lol']
});

// 3. Create application
const appAddress = await client.createApplication({
  identifier: 'my-counter',
  name: 'My Counter App',
  definition: counterDefinition
});

// 4. Handle interactions
async function increment() {
  await client.publishInteraction(appAddress, {
    type: 'INCREMENT',
    payload: {}
  });
}

// 5. Subscribe to state updates
client.subscribeToState(appAddress, (state) => {
  console.log('Current count:', state.count);
});
```

#### 3. Run Your First NSM Application

```bash
# Set your environment variables
export NOSTR_PRIVATE_KEY="your-private-key-hex"

# Run the application
node counter.js
```

**Expected Output**:
```
Application created: 30079:npub1234...:my-counter
Current count: 0
Current count: 1
Current count: 2
```

## Architecture Overview

### NSM Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Your Application                         │
├─────────────────────────────────────────────────────────────┤
│                    NSM Client Library                       │
├─────────────────────────────────────────────────────────────┤
│                    Nostr Protocol Layer                     │
├─────────────────────────────────────────────────────────────┤
│                    Relay Network                           │
└─────────────────────────────────────────────────────────────┘
```

### Event Flow

1. **Definition Events** (Kind 30079): Define state machine structure
2. **Interaction Events** (Kind 7000-7999): User actions and inputs
3. **State Update Events** (Kind 10079): Computed state changes

### State Synchronization Model

```
Client A ──┐                    ┌── Client B
           │    ┌─────────────┐  │
           └───▶│   Relays    │◀─┘
                └─────────────┘
                       │
                       ▼
              ┌─────────────────┐
              │ State Resolution │
              │ (Deterministic)  │
              └─────────────────┘
```

## Integration Patterns

### Pattern 1: New Nostr Application

**Best for**: Applications built from scratch with NSM in mind

```typescript
// Define your domain model as NSM definitions
const todoAppDefinition = {
  initialState: {
    todos: [],
    nextId: 1,
    filter: 'all'
  },
  stateSchema: {
    type: 'object',
    properties: {
      todos: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            text: { type: 'string' },
            completed: { type: 'boolean' }
          }
        }
      },
      nextId: { type: 'number' },
      filter: { type: 'string', enum: ['all', 'active', 'completed'] }
    }
  },
  interactionSchema: {
    type: 'object',
    properties: {
      type: {
        type: 'string',
        enum: ['ADD_TODO', 'TOGGLE_TODO', 'DELETE_TODO', 'SET_FILTER']
      },
      payload: { type: 'object' }
    }
  }
};

class TodoApp {
  constructor(private client: NSMClient) {}

  async addTodo(text: string) {
    await this.client.publishInteraction(this.address, {
      type: 'ADD_TODO',
      payload: { text }
    });
  }

  async toggleTodo(id: number) {
    await this.client.publishInteraction(this.address, {
      type: 'TOGGLE_TODO',
      payload: { id }
    });
  }
}
```

### Pattern 2: Existing Application Migration

**Best for**: Adding NSM to existing applications with minimal changes

```typescript
// Wrapper pattern - gradually migrate existing state
class ExistingApp {
  private nsmClient?: NSMClient;
  private localState = { /* existing state */ };

  async enableNSMSync(definition: NSMDefinition) {
    this.nsmClient = new NSMClient(config);

    // Create NSM application
    const address = await this.nsmClient.createApplication({
      identifier: 'existing-app',
      name: 'My Existing App',
      definition
    });

    // Sync local state to NSM
    await this.syncToNSM();

    // Subscribe to remote changes
    this.nsmClient.subscribeToState(address, (state) => {
      this.mergeRemoteState(state);
    });
  }

  private async syncToNSM() {
    // Transform local state to NSM interactions
    const interactions = this.convertStateToInteractions(this.localState);
    for (const interaction of interactions) {
      await this.nsmClient.publishInteraction(this.address, interaction);
    }
  }
}
```

### Pattern 3: Multi-User Collaborative Applications

**Best for**: Applications requiring real-time collaboration

```typescript
class CollaborativeWhiteboard {
  constructor(private client: NSMClient) {
    this.setupCollaboration();
  }

  private async setupCollaboration() {
    // Subscribe to all user interactions
    this.client.subscribeToInteractions(this.address, (interaction, pubkey) => {
      this.handleUserAction(interaction, pubkey);
    });

    // Handle conflicts with participant awareness
    this.client.onConflictResolved((winner, alternatives) => {
      this.showConflictResolution(winner, alternatives);
    });
  }

  async addStroke(points: Point[]) {
    await this.client.publishInteraction(this.address, {
      type: 'ADD_STROKE',
      payload: {
        points,
        color: this.currentColor,
        tool: this.currentTool,
        timestamp: Date.now()
      }
    });
  }

  private handleUserAction(interaction: NSMInteraction, userPubkey: string) {
    // Show live cursors, real-time collaboration indicators
    this.showUserActivity(userPubkey, interaction);
  }
}
```

### Pattern 4: Offline-First Applications

**Best for**: Applications that work without internet connectivity

```typescript
class OfflineFirstApp {
  private offlineQueue: NSMInteraction[] = [];

  constructor(private client: NSMClient) {
    this.setupOfflineHandling();
  }

  private setupOfflineHandling() {
    // Queue interactions when offline
    this.client.onConnectionLost(() => {
      this.isOffline = true;
    });

    // Sync queued interactions when back online
    this.client.onConnectionRestored(async () => {
      await this.syncOfflineInteractions();
      this.isOffline = false;
    });
  }

  async performAction(interaction: NSMInteraction) {
    if (this.isOffline) {
      // Apply optimistically to local state
      this.applyInteractionLocally(interaction);
      // Queue for later sync
      this.offlineQueue.push(interaction);
    } else {
      await this.client.publishInteraction(this.address, interaction);
    }
  }

  private async syncOfflineInteractions() {
    for (const interaction of this.offlineQueue) {
      try {
        await this.client.publishInteraction(this.address, interaction);
      } catch (error) {
        // Handle conflicts from optimistic updates
        this.handleSyncConflict(interaction, error);
      }
    }
    this.offlineQueue = [];
  }
}
```

## Implementation Examples

### React Integration

```typescript
// hooks/useNSMState.ts
import { useState, useEffect } from 'react';
import { NSMClient } from '@nsm/core';

export function useNSMState<T>(client: NSMClient, address: string) {
  const [state, setState] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const unsubscribe = client.subscribeToState(address, (newState) => {
      setState(newState);
      setLoading(false);
    });

    return unsubscribe;
  }, [client, address]);

  const publishInteraction = async (interaction: NSMInteraction) => {
    try {
      await client.publishInteraction(address, interaction);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    }
  };

  return { state, loading, error, publishInteraction };
}

// components/Counter.tsx
import React from 'react';
import { useNSMState } from '../hooks/useNSMState';

interface CounterState {
  count: number;
}

export function Counter({ client, address }: Props) {
  const { state, publishInteraction } = useNSMState<CounterState>(client, address);

  const increment = () => publishInteraction({ type: 'INCREMENT', payload: {} });
  const decrement = () => publishInteraction({ type: 'DECREMENT', payload: {} });

  return (
    <div>
      <h2>Count: {state?.count ?? 0}</h2>
      <button onClick={increment}>+</button>
      <button onClick={decrement}>-</button>
    </div>
  );
}
```

### Vue.js Integration

```typescript
// composables/useNSM.ts
import { ref, onUnmounted } from 'vue';
import { NSMClient } from '@nsm/core';

export function useNSM<T>(client: NSMClient, address: string) {
  const state = ref<T | null>(null);
  const loading = ref(true);

  const unsubscribe = client.subscribeToState(address, (newState) => {
    state.value = newState;
    loading.value = false;
  });

  onUnmounted(() => {
    unsubscribe();
  });

  const interact = async (interaction: NSMInteraction) => {
    await client.publishInteraction(address, interaction);
  };

  return { state, loading, interact };
}

// components/TodoList.vue
<template>
  <div>
    <h2>Todos</h2>
    <ul>
      <li v-for="todo in state?.todos" :key="todo.id">
        <input
          type="checkbox"
          :checked="todo.completed"
          @change="toggleTodo(todo.id)"
        />
        {{ todo.text }}
      </li>
    </ul>
    <input v-model="newTodo" @keyup.enter="addTodo" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useNSM } from '../composables/useNSM';

const props = defineProps<{ client: NSMClient; address: string }>();
const { state, interact } = useNSM(props.client, props.address);

const newTodo = ref('');

const addTodo = () => {
  if (newTodo.value.trim()) {
    interact({ type: 'ADD_TODO', payload: { text: newTodo.value } });
    newTodo.value = '';
  }
};

const toggleTodo = (id: number) => {
  interact({ type: 'TOGGLE_TODO', payload: { id } });
};
</script>
```

### Node.js Server Integration

```typescript
// server/nsmServer.ts
import express from 'express';
import { NSMClient } from '@nsm/core';
import { Server } from 'socket.io';

class NSMServer {
  private app = express();
  private io = new Server();
  private client: NSMClient;

  constructor() {
    this.client = new NSMClient({
      privateKey: process.env.SERVER_NOSTR_KEY,
      relays: ['wss://relay.damus.io']
    });

    this.setupRoutes();
    this.setupWebSocket();
  }

  private setupRoutes() {
    // REST API for NSM operations
    this.app.post('/apps/:id/interactions', async (req, res) => {
      try {
        const { id } = req.params;
        const interaction = req.body;

        await this.client.publishInteraction(id, interaction);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/apps/:id/state', async (req, res) => {
      try {
        const { id } = req.params;
        const state = await this.client.getCurrentState(id);
        res.json(state);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  }

  private setupWebSocket() {
    // Real-time state updates via WebSocket
    this.io.on('connection', (socket) => {
      socket.on('subscribe', (address) => {
        const unsubscribe = this.client.subscribeToState(address, (state) => {
          socket.emit('state-update', { address, state });
        });

        socket.on('disconnect', () => {
          unsubscribe();
        });
      });
    });
  }
}
```

## Migration Strategies

### Strategy 1: Gradual Migration

**Phase 1: Add NSM as Secondary State**
```typescript
class ExistingApp {
  // Keep existing state management
  private redux: Redux.Store;
  // Add NSM as secondary
  private nsm?: NSMClient;

  async enableNSMMode() {
    this.nsm = new NSMClient(config);
    // Sync existing state to NSM
    await this.syncReduxToNSM();
  }

  // Dual-write to both systems during transition
  async updateState(action: Action) {
    // Update existing system
    this.redux.dispatch(action);

    // Also update NSM if enabled
    if (this.nsm) {
      const interaction = this.convertActionToInteraction(action);
      await this.nsm.publishInteraction(this.address, interaction);
    }
  }
}
```

**Phase 2: Make NSM Primary**
```typescript
class MigratedApp {
  private nsm: NSMClient;
  // Keep Redux for complex local UI state
  private localUI: Redux.Store;

  constructor() {
    this.nsm = new NSMClient(config);
    // NSM handles business logic state
    // Local store handles UI-only state (modals, forms, etc.)
  }
}
```

### Strategy 2: Parallel Development

**Run Both Systems in Parallel**
```typescript
class HybridApp {
  private legacy: LegacyStateManager;
  private nsm: NSMClient;
  private useNSM = process.env.USE_NSM === 'true';

  async performAction(action: Action) {
    if (this.useNSM) {
      return this.nsmAction(action);
    } else {
      return this.legacyAction(action);
    }
  }

  // Feature flags control which system is used
  // Allows A/B testing between systems
}
```

### Strategy 3: Component-by-Component Migration

**Migrate Individual Features**
```typescript
// Old component using Redux
class TodoListOld extends Component {
  render() {
    const { todos } = this.props; // from Redux
    return <TodoView todos={todos} onAdd={this.props.addTodo} />;
  }
}

// New component using NSM
class TodoListNew extends Component {
  render() {
    const { state, interact } = useNSM(this.props.client, this.props.address);
    return <TodoView todos={state?.todos} onAdd={(text) => interact({type: 'ADD_TODO', payload: {text}})} />;
  }
}

// Feature flag decides which to render
function TodoApp() {
  return useFeatureFlag('nsm-todos') ? <TodoListNew /> : <TodoListOld />;
}
```

## Performance Optimization

### Caching Strategies

```typescript
class OptimizedNSMClient {
  private stateCache = new Map<string, any>();
  private interactionCache = new LRUCache<string, NSMInteraction[]>(1000);

  async getCurrentState(address: string): Promise<any> {
    // Check cache first
    if (this.stateCache.has(address)) {
      return this.stateCache.get(address);
    }

    // Fetch and cache
    const state = await this.computeStateFromInteractions(address);
    this.stateCache.set(address, state);
    return state;
  }

  subscribeToState(address: string, callback: (state: any) => void) {
    // Use cached state for immediate response
    const cachedState = this.stateCache.get(address);
    if (cachedState) {
      callback(cachedState);
    }

    // Subscribe to updates
    return this.subscribeToRealTimeUpdates(address, (newState) => {
      this.stateCache.set(address, newState);
      callback(newState);
    });
  }
}
```

### Batching and Debouncing

```typescript
class BatchedNSMClient {
  private interactionQueue: Array<{address: string, interaction: NSMInteraction}> = [];
  private batchTimeout?: NodeJS.Timeout;

  async publishInteraction(address: string, interaction: NSMInteraction) {
    // Add to batch
    this.interactionQueue.push({ address, interaction });

    // Debounce batch processing
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    this.batchTimeout = setTimeout(() => {
      this.processBatch();
    }, 100); // 100ms batch window
  }

  private async processBatch() {
    const batch = [...this.interactionQueue];
    this.interactionQueue = [];

    // Group by address for efficient processing
    const byAddress = batch.reduce((acc, item) => {
      acc[item.address] = acc[item.address] || [];
      acc[item.address].push(item.interaction);
      return acc;
    }, {} as Record<string, NSMInteraction[]>);

    // Process each address's interactions
    await Promise.all(
      Object.entries(byAddress).map(([address, interactions]) =>
        this.publishInteractionBatch(address, interactions)
      )
    );
  }
}
```

### Local-First Optimization

```typescript
class LocalFirstNSM {
  private localState = new Map<string, any>();
  private pendingInteractions = new Map<string, NSMInteraction[]>();

  async publishInteraction(address: string, interaction: NSMInteraction) {
    // Apply immediately to local state for responsiveness
    this.applyInteractionLocally(address, interaction);

    // Queue for remote sync
    this.queueForSync(address, interaction);

    // Sync in background
    this.syncInBackground(address);
  }

  private applyInteractionLocally(address: string, interaction: NSMInteraction) {
    const currentState = this.localState.get(address) || this.getInitialState(address);
    const newState = this.computeNewState(currentState, interaction);
    this.localState.set(address, newState);

    // Notify subscribers immediately
    this.notifyStateChange(address, newState);
  }

  private async syncInBackground(address: string) {
    const pending = this.pendingInteractions.get(address) || [];
    if (pending.length === 0) return;

    try {
      // Publish to network
      await this.publishToRelays(address, pending);

      // Clear pending on success
      this.pendingInteractions.delete(address);
    } catch (error) {
      // Handle sync conflicts
      await this.resolveConflicts(address, pending, error);
    }
  }
}
```

## Testing and Validation

### Unit Testing NSM Applications

```typescript
// tests/counter.test.ts
import { NSMClient, MockRelay } from '@nsm/core/testing';
import { CounterApp } from '../src/counter';

describe('Counter App', () => {
  let client: NSMClient;
  let mockRelay: MockRelay;
  let app: CounterApp;

  beforeEach(async () => {
    mockRelay = new MockRelay();
    client = new NSMClient({
      privateKey: 'test-key',
      relays: [mockRelay.url]
    });

    app = new CounterApp(client);
    await app.initialize();
  });

  test('increment increases count', async () => {
    await app.increment();

    const state = await client.getCurrentState(app.address);
    expect(state.count).toBe(1);
  });

  test('concurrent increments resolve correctly', async () => {
    // Simulate concurrent interactions
    await Promise.all([
      app.increment(),
      app.increment(),
      app.increment()
    ]);

    const state = await client.getCurrentState(app.address);
    expect(state.count).toBe(3);
  });

  test('invalid interactions are rejected', async () => {
    await expect(
      client.publishInteraction(app.address, {
        type: 'INVALID_ACTION',
        payload: {}
      })
    ).rejects.toThrow('Invalid interaction type');
  });
});
```

### Integration Testing

```typescript
// tests/integration.test.ts
import { NSMClient } from '@nsm/core';
import { TestRelay } from '@nsm/testing';

describe('Multi-Client Integration', () => {
  let relay: TestRelay;
  let clientA: NSMClient;
  let clientB: NSMClient;

  beforeAll(async () => {
    relay = new TestRelay();
    await relay.start();

    clientA = new NSMClient({
      privateKey: 'key-a',
      relays: [relay.url]
    });

    clientB = new NSMClient({
      privateKey: 'key-b',
      relays: [relay.url]
    });
  });

  test('state synchronizes between clients', async () => {
    // Client A creates application
    const address = await clientA.createApplication({
      identifier: 'shared-counter',
      name: 'Shared Counter',
      definition: counterDefinition
    });

    // Client B subscribes to the same application
    let clientBState: any;
    clientB.subscribeToState(address, (state) => {
      clientBState = state;
    });

    // Client A performs action
    await clientA.publishInteraction(address, {
      type: 'INCREMENT',
      payload: {}
    });

    // Wait for synchronization
    await relay.waitForSync();

    // Verify both clients see the same state
    const clientAState = await clientA.getCurrentState(address);
    expect(clientAState.count).toBe(1);
    expect(clientBState.count).toBe(1);
  });
});
```

### End-to-End Testing

```typescript
// tests/e2e/collaboration.test.ts
import { test, expect } from '@playwright/test';

test('collaborative editing works correctly', async ({ browser }) => {
  // Create two browser contexts (simulating two users)
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();

  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  // Both users open the same collaborative document
  await pageA.goto('/doc/shared-document');
  await pageB.goto('/doc/shared-document');

  // User A types
  await pageA.fill('[data-testid=editor]', 'Hello from User A');

  // Wait for sync
  await pageA.waitForTimeout(1000);

  // User B should see the change
  await expect(pageB.locator('[data-testid=editor]')).toHaveValue('Hello from User A');

  // User B types
  await pageB.fill('[data-testid=editor]', 'Hello from User A\nHello from User B');

  // User A should see the change
  await expect(pageA.locator('[data-testid=editor]')).toHaveValue('Hello from User A\nHello from User B');
});
```

## Troubleshooting

### Common Issues and Solutions

#### Issue: Events Not Syncing

**Symptoms**: Changes made by one client don't appear on others

**Debug Steps**:
```typescript
// Enable debug logging
const client = new NSMClient({
  ...config,
  debug: true
});

// Check relay connections
client.onRelayConnect((url) => console.log('Connected to', url));
client.onRelayDisconnect((url) => console.log('Disconnected from', url));

// Monitor event publishing
client.onEventPublished((event) => console.log('Published:', event));
client.onEventReceived((event) => console.log('Received:', event));
```

**Common Causes**:
- Relay connectivity issues
- Different relay sets between clients
- Event signature validation failures
- Network connectivity problems

**Solutions**:
```typescript
// Use multiple relays for redundancy
const client = new NSMClient({
  relays: [
    'wss://relay.damus.io',
    'wss://nos.lol',
    'wss://relay.snort.social'
  ]
});

// Implement retry logic
client.setRetryConfig({
  maxRetries: 3,
  retryDelay: 1000,
  exponentialBackoff: true
});
```

#### Issue: State Conflicts

**Symptoms**: Inconsistent state between clients, unexpected state values

**Debug Steps**:
```typescript
// Monitor conflict resolution
client.onConflictDetected((events) => {
  console.log('Conflict detected between events:', events);
});

client.onConflictResolved((winner, alternatives) => {
  console.log('Conflict resolved:', { winner, alternatives });
});

// Validate state computation
const interactions = await client.getInteractions(address);
const computedState = client.computeState(interactions);
console.log('State computation:', { interactions, computedState });
```

**Common Causes**:
- Timestamp synchronization issues
- Different conflict resolution strategies
- Invalid interaction ordering
- Race conditions in event processing

**Solutions**:
```typescript
// Use consistent conflict resolution
const client = new NSMClient({
  ...config,
  conflictResolution: 'timestamp-based' // or 'owner-based'
});

// Add interaction ordering
await client.publishInteraction(address, {
  type: 'ACTION',
  payload: {},
  metadata: {
    timestamp: Date.now(),
    sequence: this.getNextSequence()
  }
});
```

#### Issue: Performance Problems

**Symptoms**: Slow state updates, high memory usage, poor responsiveness

**Debug Steps**:
```typescript
// Monitor performance metrics
client.onPerformanceMetric((metric) => {
  console.log('Performance:', metric);
});

// Profile state computation
console.time('state-computation');
const state = await client.getCurrentState(address);
console.timeEnd('state-computation');

// Monitor memory usage
console.log('Memory usage:', process.memoryUsage());
```

**Common Causes**:
- Large state objects
- Too many historical interactions
- Inefficient state computation
- Memory leaks in event listeners

**Solutions**:
```typescript
// Implement state pruning
const client = new NSMClient({
  ...config,
  statePruning: {
    maxInteractions: 1000,
    pruneInterval: 60000
  }
});

// Use incremental state updates
client.enableIncrementalUpdates({
  batchSize: 10,
  batchInterval: 100
});

// Optimize subscriptions
const unsubscribe = client.subscribeToState(address, callback);
// Remember to unsubscribe when component unmounts
useEffect(() => unsubscribe, []);
```

### Debug Tools

#### NSM Inspector

```typescript
// Browser console helper
window.NSMInspector = {
  inspectApplication: async (address: string) => {
    const definition = await client.getDefinition(address);
    const interactions = await client.getInteractions(address);
    const state = await client.getCurrentState(address);

    return {
      definition,
      interactions: interactions.length,
      latestInteractions: interactions.slice(-10),
      state,
      stateSize: JSON.stringify(state).length
    };
  },

  validateState: async (address: string) => {
    const state = await client.getCurrentState(address);
    const definition = await client.getDefinition(address);

    try {
      validateJsonSchema(state, definition.stateSchema);
      return { valid: true };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }
};
```

#### Development Server Integration

```typescript
// Add NSM debugging endpoints
app.get('/debug/nsm/:address', async (req, res) => {
  const { address } = req.params;

  const debug = await NSMInspector.inspectApplication(address);
  res.json(debug);
});

app.get('/debug/nsm/:address/validate', async (req, res) => {
  const { address } = req.params;

  const validation = await NSMInspector.validateState(address);
  res.json(validation);
});
```

### Best Practices for Production

1. **Error Handling**: Always wrap NSM operations in try-catch blocks
2. **Offline Support**: Implement queue-based offline synchronization
3. **Performance Monitoring**: Track state computation time and memory usage
4. **Security**: Validate all interactions on both client and relay sides
5. **Testing**: Include NSM scenarios in your integration test suite
6. **Documentation**: Document your state schemas and interaction types

---

This integration guide provides the foundation for successfully adopting NSM in your applications. For additional support, consult the [API Reference](./api-reference.md), [Best Practices](./best-practices.md), and [Community Resources](./community.md).