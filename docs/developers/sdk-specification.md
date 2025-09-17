# NSM SDK Specification

## Overview

This document defines the specification for NSM (Nostr State Machines) Software Development Kits (SDKs) across multiple programming languages. The goal is to provide consistent, easy-to-use libraries that abstract the complexity of the NSM protocol while maintaining flexibility and performance.

## Design Principles

### 1. Consistency Across Languages
- Common API patterns and method names
- Consistent error handling approaches
- Uniform configuration patterns
- Shared testing strategies

### 2. Developer Experience First
- Minimal setup and configuration
- Intuitive APIs with sensible defaults
- Comprehensive documentation and examples
- Strong typing where applicable

### 3. Performance Optimization
- Efficient event batching and caching
- Connection pooling and management
- Local-first operations with background sync
- Memory usage optimization

### 4. Extensibility
- Plugin architecture for custom behaviors
- Hook system for event lifecycle
- Middleware support for transformations
- Custom conflict resolution strategies

## Core SDK Components

### 1. NSM Client

The primary interface for interacting with NSM applications.

#### Interface Specification

```typescript
interface NSMClient {
  // Configuration
  constructor(config: NSMClientConfig)
  configure(options: Partial<NSMClientConfig>): void

  // Application Management
  createApplication(definition: NSMApplicationDefinition): Promise<string>
  getApplication(address: string): Promise<NSMApplication | null>
  listApplications(filter?: ApplicationFilter): Promise<NSMApplication[]>

  // State Management
  getCurrentState<T = any>(address: string): Promise<T>
  subscribeToState<T = any>(address: string, callback: StateCallback<T>): Unsubscribe
  subscribeToStateChanges<T = any>(address: string, callback: StateChangeCallback<T>): Unsubscribe

  // Interaction Publishing
  publishInteraction(address: string, interaction: NSMInteraction): Promise<string>
  batchInteractions(address: string, interactions: NSMInteraction[]): Promise<string[]>

  // Event Querying
  getInteractions(address: string, filter?: InteractionFilter): Promise<NSMInteraction[]>
  getStateUpdates(address: string, filter?: StateUpdateFilter): Promise<NSMStateUpdate[]>

  // Conflict Resolution
  onConflictDetected(callback: ConflictCallback): Unsubscribe
  resolveConflict(events: NSMEvent[], strategy?: ConflictStrategy): NSMEvent

  // Connection Management
  connect(): Promise<void>
  disconnect(): Promise<void>
  isConnected(): boolean
  onConnectionChange(callback: ConnectionCallback): Unsubscribe

  // Utility Methods
  validateInteraction(address: string, interaction: NSMInteraction): ValidationResult
  computeAddress(publicKey: string, identifier: string): string
  createSignature(event: NSMEvent, privateKey: string): string
}
```

#### Configuration Options

```typescript
interface NSMClientConfig {
  // Authentication
  privateKey: string
  publicKey?: string

  // Relay Configuration
  relays: string[]
  fallbackRelays?: string[]
  relayTimeout?: number
  maxRelayConnections?: number

  // Performance Options
  enableCaching?: boolean
  cacheSize?: number
  batchInterval?: number
  maxBatchSize?: number

  // Conflict Resolution
  defaultConflictStrategy?: ConflictStrategy
  conflictResolutionTimeout?: number

  // Error Handling
  retryAttempts?: number
  retryDelay?: number
  errorCallback?: ErrorCallback

  // Debug Options
  debug?: boolean
  logLevel?: LogLevel
}
```

### 2. State Management System

Handles local state synchronization and conflict resolution.

#### State Manager Interface

```typescript
interface StateManager<T = any> {
  // Local State
  getLocalState(): T
  setLocalState(state: T): void
  applyInteraction(interaction: NSMInteraction): void

  // Synchronization
  sync(): Promise<void>
  enableAutoSync(interval?: number): void
  disableAutoSync(): void

  // Conflict Handling
  onConflict(callback: StateConflictCallback<T>): Unsubscribe
  resolveConflict(localState: T, remoteState: T): T

  // Validation
  validateState(state: T): ValidationResult
  validateInteraction(interaction: NSMInteraction): ValidationResult

  // Events
  onStateChange(callback: StateChangeCallback<T>): Unsubscribe
  onSyncComplete(callback: SyncCallback): Unsubscribe
}
```

### 3. Event System

Manages event creation, validation, and publishing.

#### Event Manager Interface

```typescript
interface EventManager {
  // Event Creation
  createDefinitionEvent(definition: NSMDefinition, metadata: EventMetadata): NSMEvent
  createInteractionEvent(interaction: NSMInteraction, metadata: EventMetadata): NSMEvent
  createStateUpdateEvent(stateUpdate: NSMStateUpdate, metadata: EventMetadata): NSMEvent

  // Event Validation
  validateEvent(event: NSMEvent): ValidationResult
  validateEventChain(events: NSMEvent[]): ValidationResult

  // Event Signing
  signEvent(event: NSMEvent, privateKey: string): NSMEvent
  verifySignature(event: NSMEvent): boolean

  // Event Publishing
  publishEvent(event: NSMEvent): Promise<string>
  batchPublishEvents(events: NSMEvent[]): Promise<string[]>

  // Event Querying
  queryEvents(filter: EventFilter): Promise<NSMEvent[]>
  subscribeToEvents(filter: EventFilter, callback: EventCallback): Unsubscribe
}
```

### 4. Relay Management

Handles connections to Nostr relays with failover and load balancing.

#### Relay Manager Interface

```typescript
interface RelayManager {
  // Connection Management
  addRelay(url: string, options?: RelayOptions): Promise<void>
  removeRelay(url: string): Promise<void>
  getConnectedRelays(): string[]
  getRelayStatus(url: string): RelayStatus

  // Event Operations
  publishToRelay(url: string, event: NSMEvent): Promise<boolean>
  publishToAllRelays(event: NSMEvent): Promise<PublishResult[]>
  subscribeFromRelay(url: string, filter: EventFilter): RelaySubscription

  // Load Balancing
  selectOptimalRelay(criteria?: RelaySelectionCriteria): string
  distributeLoad(events: NSMEvent[]): Promise<DistributionResult>

  // Health Monitoring
  onRelayConnect(callback: RelayEventCallback): Unsubscribe
  onRelayDisconnect(callback: RelayEventCallback): Unsubscribe
  onRelayError(callback: RelayErrorCallback): Unsubscribe

  // Statistics
  getRelayStats(url: string): RelayStatistics
  getAllRelayStats(): Map<string, RelayStatistics>
}
```

### 5. Validation Engine

Provides comprehensive validation for all NSM components.

#### Validator Interface

```typescript
interface NSMValidator {
  // Schema Validation
  validateStateSchema(schema: JSONSchema): ValidationResult
  validateInteractionSchema(schema: JSONSchema): ValidationResult
  validateState(state: any, schema: JSONSchema): ValidationResult
  validateInteraction(interaction: NSMInteraction, schema: JSONSchema): ValidationResult

  // Event Validation
  validateEventStructure(event: NSMEvent): ValidationResult
  validateEventSignature(event: NSMEvent): ValidationResult
  validateEventKind(event: NSMEvent): ValidationResult

  // Application Validation
  validateApplicationDefinition(definition: NSMDefinition): ValidationResult
  validateApplicationAddress(address: string): ValidationResult

  // Custom Validation
  addCustomValidator(name: string, validator: CustomValidator): void
  removeCustomValidator(name: string): void
  validateCustom(data: any, validatorName: string): ValidationResult
}
```

## Language-Specific Implementations

### TypeScript/JavaScript SDK

#### Package Structure
```
@nsm/sdk/
├── src/
│   ├── client/
│   │   ├── NSMClient.ts
│   │   └── ClientConfig.ts
│   ├── state/
│   │   ├── StateManager.ts
│   │   └── StateProxy.ts
│   ├── events/
│   │   ├── EventManager.ts
│   │   └── EventValidator.ts
│   ├── relay/
│   │   ├── RelayManager.ts
│   │   └── ConnectionPool.ts
│   ├── validation/
│   │   ├── SchemaValidator.ts
│   │   └── EventValidator.ts
│   ├── utils/
│   │   ├── crypto.ts
│   │   ├── serialization.ts
│   │   └── helpers.ts
│   └── index.ts
├── tests/
├── docs/
└── examples/
```

#### Key Features
- **TypeScript Support**: Full type definitions and inference
- **React Hooks**: `useNSMState`, `useNSMInteraction`, `useNSMApplication`
- **Vue Composables**: `useNSM`, `useNSMState`, `useNSMApp`
- **Node.js Support**: Server-side applications and APIs
- **Web Workers**: Background processing for state computation
- **IndexedDB**: Local persistence and offline support

#### Installation
```bash
npm install @nsm/sdk
# or
yarn add @nsm/sdk
# or
pnpm add @nsm/sdk
```

#### Usage Example
```typescript
import { NSMClient, createReactHooks } from '@nsm/sdk';

const client = new NSMClient({
  privateKey: process.env.NOSTR_PRIVATE_KEY,
  relays: ['wss://relay.damus.io', 'wss://nos.lol']
});

const { useNSMState, useNSMInteraction } = createReactHooks(client);

function CounterApp({ address }: { address: string }) {
  const { state, loading, error } = useNSMState<{ count: number }>(address);
  const { publishInteraction } = useNSMInteraction(address);

  const increment = () => publishInteraction({ type: 'INCREMENT', payload: {} });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h2>Count: {state?.count ?? 0}</h2>
      <button onClick={increment}>Increment</button>
    </div>
  );
}
```

### Python SDK

#### Package Structure
```
nsm-sdk/
├── nsm_sdk/
│   ├── __init__.py
│   ├── client/
│   │   ├── __init__.py
│   │   ├── nsm_client.py
│   │   └── config.py
│   ├── state/
│   │   ├── __init__.py
│   │   ├── manager.py
│   │   └── synchronizer.py
│   ├── events/
│   │   ├── __init__.py
│   │   ├── manager.py
│   │   └── validator.py
│   ├── relay/
│   │   ├── __init__.py
│   │   ├── manager.py
│   │   └── connection.py
│   ├── validation/
│   │   ├── __init__.py
│   │   └── validator.py
│   └── utils/
│       ├── __init__.py
│       ├── crypto.py
│       └── helpers.py
├── tests/
├── docs/
└── examples/
```

#### Key Features
- **AsyncIO Support**: Async/await for all I/O operations
- **Type Hints**: Full type annotations with mypy support
- **Pydantic Models**: Data validation and serialization
- **FastAPI Integration**: Easy API development
- **Django Integration**: ORM integration and middleware
- **SQLAlchemy Support**: Database state persistence

#### Installation
```bash
pip install nsm-sdk
```

#### Usage Example
```python
import asyncio
from nsm_sdk import NSMClient, NSMDefinition

async def main():
    client = NSMClient(
        private_key="your-private-key",
        relays=["wss://relay.damus.io", "wss://nos.lol"]
    )

    # Create application
    definition = NSMDefinition(
        initial_state={"count": 0},
        state_schema={
            "type": "object",
            "properties": {"count": {"type": "number"}},
            "required": ["count"]
        },
        interaction_schema={
            "type": "object",
            "properties": {
                "type": {"type": "string", "enum": ["INCREMENT", "DECREMENT"]}
            },
            "required": ["type"]
        }
    )

    address = await client.create_application(
        identifier="counter",
        name="Counter App",
        definition=definition
    )

    # Subscribe to state changes
    async def on_state_change(state):
        print(f"Count: {state['count']}")

    unsubscribe = await client.subscribe_to_state(address, on_state_change)

    # Publish interaction
    await client.publish_interaction(address, {
        "type": "INCREMENT",
        "payload": {}
    })

    # Keep running
    await asyncio.sleep(10)
    unsubscribe()

if __name__ == "__main__":
    asyncio.run(main())
```

### Go SDK

#### Package Structure
```
nsm-sdk/
├── client/
│   ├── client.go
│   ├── config.go
│   └── options.go
├── state/
│   ├── manager.go
│   ├── synchronizer.go
│   └── types.go
├── events/
│   ├── manager.go
│   ├── validator.go
│   └── types.go
├── relay/
│   ├── manager.go
│   ├── connection.go
│   └── pool.go
├── validation/
│   ├── validator.go
│   └── schema.go
├── utils/
│   ├── crypto.go
│   ├── encoding.go
│   └── helpers.go
├── examples/
└── README.md
```

#### Key Features
- **High Performance**: Optimized for concurrent processing
- **Context Support**: Proper context handling for cancellation
- **Structured Logging**: Integration with popular logging frameworks
- **Metrics Integration**: Prometheus metrics support
- **gRPC Support**: Server development with gRPC
- **Database Integration**: GORM and database/sql support

#### Installation
```bash
go get github.com/nsm-protocol/nsm-sdk-go
```

#### Usage Example
```go
package main

import (
    "context"
    "fmt"
    "log"

    "github.com/nsm-protocol/nsm-sdk-go/client"
    "github.com/nsm-protocol/nsm-sdk-go/types"
)

func main() {
    config := client.Config{
        PrivateKey: "your-private-key",
        Relays:     []string{"wss://relay.damus.io", "wss://nos.lol"},
    }

    client, err := client.New(config)
    if err != nil {
        log.Fatal(err)
    }
    defer client.Close()

    // Create application
    definition := types.NSMDefinition{
        InitialState: map[string]interface{}{"count": 0},
        StateSchema: map[string]interface{}{
            "type": "object",
            "properties": map[string]interface{}{
                "count": map[string]interface{}{"type": "number"},
            },
            "required": []string{"count"},
        },
        InteractionSchema: map[string]interface{}{
            "type": "object",
            "properties": map[string]interface{}{
                "type": map[string]interface{}{
                    "type": "string",
                    "enum": []string{"INCREMENT", "DECREMENT"},
                },
            },
            "required": []string{"type"},
        },
    }

    ctx := context.Background()
    address, err := client.CreateApplication(ctx, "counter", "Counter App", definition)
    if err != nil {
        log.Fatal(err)
    }

    // Subscribe to state changes
    stateChan, err := client.SubscribeToState(ctx, address)
    if err != nil {
        log.Fatal(err)
    }

    go func() {
        for state := range stateChan {
            fmt.Printf("Count: %v\n", state["count"])
        }
    }()

    // Publish interaction
    interaction := types.NSMInteraction{
        Type:    "INCREMENT",
        Payload: map[string]interface{}{},
    }

    _, err = client.PublishInteraction(ctx, address, interaction)
    if err != nil {
        log.Fatal(err)
    }

    // Keep running
    select {}
}
```

## SDK Features and Capabilities

### 1. Framework Integrations

#### React Integration
```typescript
// Hook-based API
const { state, publishInteraction, loading, error } = useNSMApplication(address);

// Higher-order components
const CounterWithNSM = withNSM(Counter, { address: "30079:..." });

// Context provider
<NSMProvider client={client}>
  <App />
</NSMProvider>
```

#### Vue Integration
```typescript
// Composition API
const { state, interact, loading } = useNSM(client, address);

// Plugin registration
app.use(NSMPlugin, { client });

// Global properties
this.$nsm.publishInteraction(address, interaction);
```

#### Angular Integration
```typescript
// Service injection
constructor(private nsm: NSMService) {}

// Reactive patterns
ngOnInit() {
  this.state$ = this.nsm.getState$(address);
}

// Module configuration
@NgModule({
  imports: [NSMModule.forRoot(config)]
})
```

### 2. Testing Utilities

#### Mock Client
```typescript
import { MockNSMClient } from '@nsm/sdk/testing';

const mockClient = new MockNSMClient();
mockClient.mockState(address, { count: 5 });

// Test interactions
await mockClient.publishInteraction(address, { type: 'INCREMENT' });
expect(mockClient.getState(address)).toEqual({ count: 6 });
```

#### Test Relay
```typescript
import { TestRelay } from '@nsm/sdk/testing';

const relay = new TestRelay();
await relay.start();

// Use in tests
const client = new NSMClient({
  privateKey: testKey,
  relays: [relay.url]
});
```

### 3. Development Tools

#### Debug Logger
```typescript
import { NSMClient, DebugLogger } from '@nsm/sdk';

const client = new NSMClient({
  ...config,
  plugins: [new DebugLogger({ level: 'verbose' })]
});
```

#### Performance Monitor
```typescript
import { PerformanceMonitor } from '@nsm/sdk/monitoring';

const monitor = new PerformanceMonitor();
client.addPlugin(monitor);

// Get metrics
const metrics = monitor.getMetrics();
console.log(`Average state computation: ${metrics.avgStateComputation}ms`);
```

#### State Inspector
```typescript
import { StateInspector } from '@nsm/sdk/dev-tools';

const inspector = new StateInspector();
inspector.inspect(address).then(report => {
  console.log(report.summary);
  console.log(report.interactions);
  console.log(report.conflicts);
});
```

## Distribution and Packaging

### NPM Package (@nsm/sdk)
- Core SDK for TypeScript/JavaScript
- React hooks and components
- Vue composables
- Testing utilities
- Development tools

### PyPI Package (nsm-sdk)
- Pure Python implementation
- AsyncIO support
- Framework integrations
- CLI tools

### Go Module (github.com/nsm-protocol/nsm-sdk-go)
- High-performance implementation
- Standard library compatibility
- Popular framework integrations

### Additional Packages

#### CLI Tools
```bash
npm install -g @nsm/cli
nsm create-app my-counter
nsm validate-definition definition.json
nsm generate-schema --type interaction
```

#### Browser Extensions
- Chrome/Firefox extensions for NSM debugging
- DevTools integration
- State inspection and manipulation

#### IDE Plugins
- VSCode extension with syntax highlighting
- IntelliJ plugin for Java/Kotlin
- Vim/Emacs plugins

## Documentation and Examples

### 1. API Documentation
- Auto-generated API docs for all languages
- Interactive examples and tutorials
- Migration guides between versions

### 2. Example Applications
- Counter app (basic CRUD operations)
- Todo list (collaborative editing)
- Chat application (real-time messaging)
- Whiteboard (complex state management)
- Game (turn-based mechanics)

### 3. Integration Guides
- Step-by-step framework integration
- Performance optimization guides
- Production deployment best practices
- Troubleshooting and debugging

### 4. Community Resources
- GitHub discussions and issues
- Discord community server
- StackOverflow tags
- Weekly community calls

## Version Management and Compatibility

### Semantic Versioning
- Major: Breaking changes to public API
- Minor: New features, backward compatible
- Patch: Bug fixes, no API changes

### Compatibility Matrix
| SDK Version | Protocol Version | Node Support | Browser Support |
|-------------|------------------|--------------|-----------------|
| 1.x         | NIP-NSM v1       | 16+          | ES2020+         |
| 2.x         | NIP-NSM v2       | 18+          | ES2022+         |

### Migration Guides
- Automated migration tools
- Deprecation warnings with alternatives
- Migration timeline and support periods

## Quality Assurance

### Testing Strategy
- Unit tests for all public APIs
- Integration tests with real relays
- End-to-end tests with example applications
- Performance benchmarks and regression testing
- Cross-language compatibility tests

### Code Quality
- Automated linting and formatting
- Type checking (TypeScript, mypy, etc.)
- Security vulnerability scanning
- Code coverage requirements (>90%)

### Release Process
- Automated CI/CD pipelines
- Staging environment testing
- Community beta testing program
- Gradual rollout strategy

---

This SDK specification provides the foundation for building consistent, high-quality NSM libraries across multiple programming languages, enabling developers to easily adopt and integrate the NSM protocol into their applications.