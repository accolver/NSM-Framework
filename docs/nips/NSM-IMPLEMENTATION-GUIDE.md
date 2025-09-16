# NSM Protocol Implementation Guide

This guide provides practical examples and implementation patterns for building applications using the Nostr State Machine (NSM) protocol as defined in NIP-NSM and NIP-NSM-VALIDATION.

## Quick Start

### 1. Installing the Reference Implementation

```bash
npm install @nsm/core @nsm/client @nsm/crypto
```

### 2. Basic Application Setup

```typescript
import { NSMClient } from '@nsm/client';
import { createNSMDefinitionEvent } from '@nsm/core';

// Initialize NSM client
const client = new NSMClient({
  relays: ['wss://relay.damus.io', 'wss://nos.lol'],
  blossomServers: ['https://blossom.primal.net']
});

// Connect to relays
await client.connect();
```

### 3. Creating Your First NSM Application

```typescript
// Define application metadata
const metadata = {
  identifier: "my-counter-app",
  name: "My Counter App",
  engine: "xstate",
  engineCodeURI: "blossom://..." // Upload your state machine code
};

// Define application content
const content = {
  initialState: { count: 0 },
  stateSchema: {
    type: "object",
    properties: {
      count: { type: "number" }
    },
    required: ["count"]
  },
  interactionSchema: {
    type: "object",
    properties: {
      type: { type: "string", enum: ["INCREMENT", "DECREMENT"] }
    },
    required: ["type"]
  }
};

// Create and publish definition event
const definitionEvent = createNSMDefinitionEvent(metadata, content);
await client.publishEvent(definitionEvent);
```

## Complete Application Examples

### Example 1: Collaborative Todo List

#### State Machine Definition

```typescript
// todo-machine.ts
export const todoMachine = {
  id: 'todoApp',
  initial: 'idle',
  context: {
    todos: [],
    nextId: 1
  },
  states: {
    idle: {
      on: {
        ADD_TODO: {
          actions: 'addTodo'
        },
        TOGGLE_TODO: {
          actions: 'toggleTodo'
        },
        DELETE_TODO: {
          actions: 'deleteTodo'
        }
      }
    }
  }
};

export const todoActions = {
  addTodo: (context, event) => ({
    ...context,
    todos: [
      ...context.todos,
      {
        id: context.nextId,
        text: event.payload.text,
        completed: false,
        createdAt: Date.now()
      }
    ],
    nextId: context.nextId + 1
  }),

  toggleTodo: (context, event) => ({
    ...context,
    todos: context.todos.map(todo =>
      todo.id === event.payload.id
        ? { ...todo, completed: !todo.completed }
        : todo
    )
  }),

  deleteTodo: (context, event) => ({
    ...context,
    todos: context.todos.filter(todo => todo.id !== event.payload.id)
  })
};
```

#### NSM Integration

```typescript
// todo-nsm-app.ts
import { NSMApplication } from '@nsm/client';

class TodoNSMApp extends NSMApplication {
  constructor() {
    super({
      identifier: 'collaborative-todo',
      name: 'Collaborative Todo List',
      engine: 'xstate',
      initialState: { todos: [], nextId: 1 },
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
                completed: { type: 'boolean' },
                createdAt: { type: 'number' }
              },
              required: ['id', 'text', 'completed', 'createdAt']
            }
          },
          nextId: { type: 'number' }
        },
        required: ['todos', 'nextId']
      },
      interactionSchema: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['ADD_TODO', 'TOGGLE_TODO', 'DELETE_TODO']
          },
          payload: { type: 'object' }
        },
        required: ['type']
      }
    });
  }

  // High-level API methods
  async addTodo(text: string) {
    return this.sendInteraction({
      type: 'ADD_TODO',
      payload: { text }
    });
  }

  async toggleTodo(id: number) {
    return this.sendInteraction({
      type: 'TOGGLE_TODO',
      payload: { id }
    });
  }

  async deleteTodo(id: number) {
    return this.sendInteraction({
      type: 'DELETE_TODO',
      payload: { id }
    });
  }

  // Getters for current state
  get todos() {
    return this.currentState.todos || [];
  }

  get todoCount() {
    return this.todos.length;
  }

  get completedCount() {
    return this.todos.filter(todo => todo.completed).length;
  }
}

// Usage
const todoApp = new TodoNSMApp();
await todoApp.initialize();

// Add a todo
await todoApp.addTodo("Buy groceries");

// Listen for state changes
todoApp.on('stateChanged', (newState) => {
  console.log('Todo list updated:', newState.todos);
});
```

#### React Component Integration

```tsx
// TodoApp.tsx
import React from 'react';
import { useNSMApplication } from '@nsm/react';

interface Todo {
  id: number;
  text: string;
  completed: boolean;
  createdAt: number;
}

export const TodoApp: React.FC = () => {
  const todoApp = useNSMApplication('collaborative-todo');
  const [newTodoText, setNewTodoText] = React.useState('');

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newTodoText.trim()) {
      await todoApp.addTodo(newTodoText.trim());
      setNewTodoText('');
    }
  };

  if (!todoApp.isConnected) {
    return <div>Connecting to Nostr...</div>;
  }

  return (
    <div className="todo-app">
      <h1>Collaborative Todo List</h1>

      <form onSubmit={handleAddTodo}>
        <input
          type="text"
          value={newTodoText}
          onChange={(e) => setNewTodoText(e.target.value)}
          placeholder="Add a new todo..."
        />
        <button type="submit">Add Todo</button>
      </form>

      <div className="stats">
        Total: {todoApp.todoCount} |
        Completed: {todoApp.completedCount}
      </div>

      <ul className="todo-list">
        {todoApp.todos.map((todo: Todo) => (
          <li key={todo.id} className={todo.completed ? 'completed' : ''}>
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => todoApp.toggleTodo(todo.id)}
            />
            <span>{todo.text}</span>
            <button onClick={() => todoApp.deleteTodo(todo.id)}>Delete</button>
          </li>
        ))}
      </ul>

      <div className="participants">
        Active users: {todoApp.participants.length}
      </div>
    </div>
  );
};
```

### Example 2: Real-time Drawing Canvas

#### State Machine Definition

```typescript
// canvas-machine.ts
export const canvasMachine = {
  id: 'canvasApp',
  initial: 'idle',
  context: {
    objects: [],
    selectedTool: 'pen',
    strokeColor: '#000000',
    strokeWidth: 2
  },
  states: {
    idle: {
      on: {
        START_DRAWING: 'drawing',
        SELECT_TOOL: { actions: 'selectTool' },
        SET_COLOR: { actions: 'setColor' },
        SET_WIDTH: { actions: 'setWidth' },
        CLEAR_CANVAS: { actions: 'clearCanvas' }
      }
    },
    drawing: {
      on: {
        ADD_POINT: { actions: 'addPoint' },
        END_DRAWING: {
          target: 'idle',
          actions: 'finishPath'
        }
      }
    }
  }
};

export const canvasActions = {
  selectTool: (context, event) => ({
    ...context,
    selectedTool: event.payload.tool
  }),

  setColor: (context, event) => ({
    ...context,
    strokeColor: event.payload.color
  }),

  addPoint: (context, event) => {
    const currentPath = context.objects[context.objects.length - 1];
    if (currentPath && currentPath.type === 'path' && !currentPath.completed) {
      return {
        ...context,
        objects: [
          ...context.objects.slice(0, -1),
          {
            ...currentPath,
            points: [...currentPath.points, event.payload.point]
          }
        ]
      };
    }
    return context;
  },

  finishPath: (context, event) => ({
    ...context,
    objects: context.objects.map((obj, index) =>
      index === context.objects.length - 1 && obj.type === 'path'
        ? { ...obj, completed: true }
        : obj
    )
  })
};
```

## Advanced Patterns

### Conflict Resolution Implementation

```typescript
// Custom conflict resolution for canvas application
class CanvasConflictResolver {
  resolve(events: NSMStateUpdateEvent[]): NSMStateUpdateEvent {
    // Sort by timestamp first
    const sorted = events.sort((a, b) => {
      if (a.created_at !== b.created_at) {
        return b.created_at - a.created_at;
      }
      return a.id.localeCompare(b.id);
    });

    // For canvas, merge drawing operations from different users
    const baseState = sorted[0];
    const conflictingStates = sorted.slice(1);

    let mergedState = JSON.parse(baseState.content).state;

    for (const conflictState of conflictingStates) {
      const state = JSON.parse(conflictState.content).state;
      mergedState = this.mergeCanvasStates(mergedState, state);
    }

    return {
      ...baseState,
      content: JSON.stringify({
        state: mergedState,
        metadata: {
          stateVersion: baseState.metadata?.stateVersion + 1,
          conflictResolution: 'canvas-merge',
          mergedFrom: conflictingStates.map(e => e.id)
        }
      })
    };
  }

  private mergeCanvasStates(base: any, incoming: any): any {
    // Merge objects by keeping all unique drawing objects
    const mergedObjects = [...base.objects];

    for (const incomingObj of incoming.objects) {
      if (!mergedObjects.find(obj => obj.id === incomingObj.id)) {
        mergedObjects.push(incomingObj);
      }
    }

    return {
      ...base,
      objects: mergedObjects.sort((a, b) => a.timestamp - b.timestamp)
    };
  }
}
```

### State Machine Caching

```typescript
// Efficient state machine caching strategy
class NSMStateCache {
  private cache = new Map<string, any>();
  private maxSize = 1000;
  private ttl = 5 * 60 * 1000; // 5 minutes

  set(key: string, state: any): void {
    if (this.cache.size >= this.maxSize) {
      // Remove oldest entries
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      state,
      timestamp: Date.now()
    });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.state;
  }

  invalidate(keyPattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(keyPattern)) {
        this.cache.delete(key);
      }
    }
  }
}
```

### Performance Optimization

```typescript
// Optimized event handling with batching
class OptimizedNSMClient extends NSMClient {
  private eventBatch: NSMInteractionEvent[] = [];
  private batchTimeout: NodeJS.Timeout | null = null;
  private readonly batchSize = 10;
  private readonly batchDelayMs = 100;

  async sendInteraction(interaction: any): Promise<void> {
    const event = this.createInteractionEvent(interaction);
    this.eventBatch.push(event);

    if (this.eventBatch.length >= this.batchSize) {
      await this.flushBatch();
    } else if (!this.batchTimeout) {
      this.batchTimeout = setTimeout(() => this.flushBatch(), this.batchDelayMs);
    }
  }

  private async flushBatch(): Promise<void> {
    if (this.eventBatch.length === 0) return;

    const batch = [...this.eventBatch];
    this.eventBatch = [];

    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    // Process batch efficiently
    await this.processBatch(batch);
  }

  private async processBatch(events: NSMInteractionEvent[]): Promise<void> {
    // Optimize state machine execution by batching transitions
    const stateUpdates = this.computeBatchedStateUpdates(events);

    // Publish single state update instead of multiple
    if (stateUpdates.length > 0) {
      await this.publishStateUpdate(stateUpdates[stateUpdates.length - 1]);
    }
  }
}
```

## Security Best Practices

### Input Validation Example

```typescript
// Comprehensive input validation for NSM applications
import { sanitizeUserInput } from '@nsm/core';

class SecureNSMApplication extends NSMApplication {
  protected validateInteraction(interaction: any): void {
    // Validate interaction structure
    if (!interaction.type || typeof interaction.type !== 'string') {
      throw new Error('Invalid interaction type');
    }

    // Sanitize text inputs
    if (interaction.payload?.text) {
      interaction.payload.text = sanitizeUserInput(interaction.payload.text, {
        maxLength: 1000,
        allowHtml: false
      });
    }

    // Validate against schema
    const isValid = this.validateAgainstSchema(
      interaction,
      this.config.interactionSchema
    );

    if (!isValid) {
      throw new Error('Interaction does not match schema');
    }

    // Rate limiting check
    if (!this.rateLimiter.checkRequest(this.currentUser.pubkey)) {
      throw new Error('Rate limit exceeded');
    }
  }
}
```

### Sandboxed State Machine Execution

```typescript
// Secure execution environment for untrusted state machines
import { SecuritySandbox } from '@nsm/client/security';

class SecureStateMachineLoader {
  private sandbox = new SecuritySandbox({
    timeoutMs: 5000,
    memoryLimitMB: 50,
    allowedGlobals: ['console', 'JSON', 'Math']
  });

  async loadStateMachine(codeUri: string): Promise<any> {
    // Download state machine code from Blossom
    const code = await this.downloadFromBlossom(codeUri);

    // Verify code integrity
    if (!this.verifyCodeHash(code, codeUri)) {
      throw new Error('Code integrity verification failed');
    }

    // Execute in secure sandbox
    const machine = await this.sandbox.executeSecurely(
      code,
      { XState: this.getRestrictedXState() },
      this.currentUser.pubkey
    );

    return machine;
  }

  private getRestrictedXState(): any {
    // Provide limited XState API without dangerous features
    return {
      createMachine: (config: any) => {
        // Validate machine configuration
        this.validateMachineConfig(config);
        return originalXState.createMachine(config);
      }
    };
  }
}
```

## Testing Your NSM Application

### Unit Testing

```typescript
// test/todo-app.test.ts
import { describe, it, expect } from 'bun:test';
import { TodoNSMApp } from '../src/todo-app';

describe('TodoNSMApp', () => {
  let app: TodoNSMApp;

  beforeEach(() => {
    app = new TodoNSMApp();
  });

  it('should add a todo item', async () => {
    await app.addTodo('Test todo');

    expect(app.todos).toHaveLength(1);
    expect(app.todos[0].text).toBe('Test todo');
    expect(app.todos[0].completed).toBe(false);
  });

  it('should toggle todo completion', async () => {
    await app.addTodo('Test todo');
    const todoId = app.todos[0].id;

    await app.toggleTodo(todoId);

    expect(app.todos[0].completed).toBe(true);
  });

  it('should handle concurrent modifications', async () => {
    // Simulate multiple users adding todos simultaneously
    await Promise.all([
      app.addTodo('Todo 1'),
      app.addTodo('Todo 2'),
      app.addTodo('Todo 3')
    ]);

    expect(app.todos).toHaveLength(3);
    expect(app.todoCount).toBe(3);
  });
});
```

### Integration Testing

```typescript
// test/integration/multi-user.test.ts
import { describe, it, expect } from 'bun:test';
import { NSMClient } from '@nsm/client';

describe('Multi-user NSM integration', () => {
  it('should synchronize state across multiple clients', async () => {
    // Create three clients representing different users
    const alice = new NSMClient({ relays: ['wss://relay.damus.io'] });
    const bob = new NSMClient({ relays: ['wss://relay.damus.io'] });
    const charlie = new NSMClient({ relays: ['wss://relay.damus.io'] });

    await Promise.all([
      alice.connect(),
      bob.connect(),
      charlie.connect()
    ]);

    // Alice creates a todo app
    const appId = 'test-todo-' + Date.now();
    const app = await alice.createApplication({
      identifier: appId,
      name: 'Test Todo App',
      // ... configuration
    });

    // Bob and Charlie join the application
    const bobApp = await bob.joinApplication(appId);
    const charlieApp = await charlie.joinApplication(appId);

    // All users add todos simultaneously
    await Promise.all([
      app.addTodo('Alice todo'),
      bobApp.addTodo('Bob todo'),
      charlieApp.addTodo('Charlie todo')
    ]);

    // Wait for synchronization
    await new Promise(resolve => setTimeout(resolve, 1000));

    // All clients should have the same state
    expect(app.todos).toHaveLength(3);
    expect(bobApp.todos).toHaveLength(3);
    expect(charlieApp.todos).toHaveLength(3);

    // Verify todos from all users are present
    const allTodos = app.todos.map(t => t.text);
    expect(allTodos).toContain('Alice todo');
    expect(allTodos).toContain('Bob todo');
    expect(allTodos).toContain('Charlie todo');
  });
});
```

## Deployment and Production Considerations

### Environment Configuration

```typescript
// config/production.ts
export const productionConfig = {
  relays: [
    'wss://relay.damus.io',
    'wss://nos.lol',
    'wss://relay.snort.social'
  ],
  blossomServers: [
    'https://blossom.primal.net',
    'https://nostrage.com'
  ],
  caching: {
    enabled: true,
    ttl: 300000, // 5 minutes
    maxSize: 10000
  },
  security: {
    sandbox: {
      timeoutMs: 3000,
      memoryLimitMB: 25
    },
    rateLimiting: {
      capacity: 100,
      refillRate: 10
    }
  },
  monitoring: {
    enabled: true,
    metricsInterval: 60000,
    alertThresholds: {
      errorRate: 0.05,
      responseTime: 1000
    }
  }
};
```

### Error Handling and Recovery

```typescript
// Robust error handling for production NSM applications
class ProductionNSMApp extends NSMApplication {
  private retryCount = 0;
  private maxRetries = 3;

  protected async handleError(error: Error, context: string): Promise<void> {
    console.error(`NSM Error in ${context}:`, error);

    // Log error for monitoring
    this.logError(error, context);

    // Attempt recovery based on error type
    if (error.message.includes('network')) {
      await this.handleNetworkError();
    } else if (error.message.includes('validation')) {
      await this.handleValidationError(error);
    } else if (error.message.includes('conflict')) {
      await this.handleConflictError();
    }

    // Emit error event for UI handling
    this.emit('error', { error, context, retry: this.retryCount < this.maxRetries });
  }

  private async handleNetworkError(): Promise<void> {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      console.log(`Retrying connection (${this.retryCount}/${this.maxRetries})`);

      await new Promise(resolve => setTimeout(resolve, 1000 * this.retryCount));
      await this.reconnect();
    } else {
      this.emit('criticalError', 'Max network retries exceeded');
    }
  }

  private async handleValidationError(error: Error): Promise<void> {
    // Log validation error details for debugging
    console.warn('Validation error details:', {
      message: error.message,
      stack: error.stack,
      lastInteraction: this.lastInteraction
    });

    // Reset to last known good state if available
    if (this.lastValidState) {
      await this.restoreState(this.lastValidState);
    }
  }
}
```

This implementation guide provides practical, production-ready examples for building NSM applications. All code examples are based on the reference implementation and follow the security and validation requirements specified in the NSM NIPs.