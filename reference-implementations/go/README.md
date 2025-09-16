# NSM Go Reference Implementation

A high-performance Go implementation of the Nostr State Machine (NSM) protocol, designed for concurrent event processing and high-throughput applications.

## Features

- ✅ **Complete NSM Protocol Support**: All event kinds (30079, 7000-7999, 10079)
- ✅ **High Performance**: Concurrent event processing and efficient memory usage
- ✅ **Event Validation**: JSON Schema validation with robust error handling
- ✅ **Cryptographic Security**: secp256k1 signing and verification using go-nostr
- ✅ **Conflict Resolution**: Multiple resolution strategies with deterministic outcomes
- ✅ **Relay Communication**: WebSocket-based communication with connection pooling
- ✅ **Type Safety**: Strong typing with comprehensive error handling

## Installation

```bash
go mod tidy
go build
```

## Quick Start

### 1. Basic Usage

```go
package main

import (
    "log"
    "github.com/nbd-wtf/go-nostr"
)

func main() {
    // Generate private key
    privateKey := nostr.GeneratePrivateKey()
    privateKeyHex := hex.EncodeToString(privateKey[:])

    // Create client
    relayURLs := []string{"wss://relay.damus.io"}
    client, err := NewNSMClient(privateKeyHex, relayURLs)
    if err != nil {
        log.Fatal(err)
    }

    // Define application
    definition := CreateSimpleCounterDefinition()

    // Publish definition
    event, err := client.PublishDefinition(
        "my-counter",
        "My Counter",
        "go-nsm",
        definition,
        nil, nil, nil,
    )
    if err != nil {
        log.Fatal(err)
    }

    log.Printf("Published definition: %s", event.ID)
}
```

### 2. Run Example

```bash
go run nsm.go
```

## Core Components

### NSMDefinition
Defines the structure and behavior of an NSM application:
```go
definition := &NSMDefinition{
    InitialState: map[string]interface{}{
        "count": 0,
    },
    StateSchema: map[string]interface{}{
        "type": "object",
        "properties": map[string]interface{}{
            "count": map[string]interface{}{
                "type": "number",
            },
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
```

### NSMInteraction
Represents user actions that trigger state changes:
```go
interaction := &NSMInteraction{
    Type: "INCREMENT",
    Payload: map[string]interface{}{
        "amount": 1,
    },
    Metadata: map[string]interface{}{
        "timestamp": time.Now().Unix(),
    },
}
```

### NSMStateUpdate
Canonical state snapshots with conflict resolution metadata:
```go
stateUpdate := &NSMStateUpdate{
    State: map[string]interface{}{
        "count": 1,
    },
    Metadata: map[string]interface{}{
        "stateVersion": 1,
        "lastInteractionId": "event-id",
        "conflictResolution": "timestamp-based",
    },
}
```

### NSMClient
High-level client for NSM protocol operations:
```go
client, err := NewNSMClient(privateKey, relayURLs)

// Publish events
definitionEvent, err := client.PublishDefinition(...)
interactionEvent, err := client.PublishInteraction(...)
stateUpdateEvent, err := client.PublishStateUpdate(...)

// Create addresses
address := client.CreateAddress("my-app")
```

## Event Validation

The implementation includes comprehensive validation using JSON Schema:

```go
validator := NewNSMEventValidator()

// Validate events against schemas
isValid := validator.ValidateDefinitionEvent(event, definition)
isValid := validator.ValidateInteractionEvent(event, definition)
isValid := validator.ValidateStateUpdateEvent(event, definition)
```

## Conflict Resolution

Multiple conflict resolution strategies are supported:

```go
resolver := NewNSMConflictResolver()

// Timestamp-based resolution (most recent wins)
winner, err := resolver.TimestampBasedResolution(conflictingEvents)

// Owner-based resolution (owner events have precedence)
winner, err := resolver.OwnerBasedResolution(conflictingEvents, ownerPubkey)
```

## Performance Characteristics

- **Concurrent Processing**: Supports concurrent event handling with goroutines
- **Memory Efficient**: Minimal memory allocation for event processing
- **High Throughput**: Optimized for high-frequency state updates
- **Connection Pooling**: Efficient relay connection management

## Architecture

### Event Factory
The `NSMEventFactory` provides deterministic event creation with:
- Automatic kind calculation for interaction events
- Cryptographic signing with error handling
- Tag validation and formatting

### Validation System
The `NSMEventValidator` ensures protocol compliance with:
- JSON Schema validation using `gojsonschema`
- Structural validation for all event types
- Comprehensive error reporting

### Conflict Resolution
The `NSMConflictResolver` provides deterministic conflict resolution with:
- Timestamp-based ordering with ID tiebreaking
- Owner precedence with fallback strategies
- Sorting algorithms optimized for performance

## Application Development

### 1. Define Your Application State Machine

```go
func CreateMyAppDefinition() *NSMDefinition {
    return &NSMDefinition{
        InitialState: map[string]interface{}{
            // Your initial state
        },
        StateSchema: map[string]interface{}{
            // JSON Schema for state validation
        },
        InteractionSchema: map[string]interface{}{
            // JSON Schema for interaction validation
        },
    }
}
```

### 2. Handle State Transitions

```go
func ProcessInteraction(currentState map[string]interface{}, interaction *NSMInteraction) map[string]interface{} {
    newState := make(map[string]interface{})

    // Copy current state
    for k, v := range currentState {
        newState[k] = v
    }

    // Apply interaction logic
    switch interaction.Type {
    case "MY_ACTION":
        // Update state based on interaction
        newState["field"] = interaction.Payload["value"]
    }

    return newState
}
```

### 3. Concurrent Event Processing

```go
func ProcessEventsAsync(client *NSMClient, events []*nostr.Event) {
    var wg sync.WaitGroup

    for _, event := range events {
        wg.Add(1)
        go func(e *nostr.Event) {
            defer wg.Done()
            // Process event
            processEvent(client, e)
        }(event)
    }

    wg.Wait()
}
```

## Error Handling

The implementation provides comprehensive error handling:

```go
// All functions return errors for proper handling
event, err := client.PublishDefinition(...)
if err != nil {
    log.Printf("Failed to publish definition: %v", err)
    return
}

// Validation errors are clearly reported
isValid := validator.ValidateDefinitionEvent(event, definition)
if !isValid {
    log.Printf("Event validation failed")
    return
}
```

## Testing

Run tests with:

```bash
go test ./...
```

## Dependencies

- `github.com/nbd-wtf/go-nostr` - Core Nostr protocol implementation
- `github.com/xeipuuv/gojsonschema` - JSON Schema validation
- `github.com/gorilla/websocket` - WebSocket communication
- `github.com/btcsuite/btcd/btcec/v2` - Cryptographic operations

## Security Considerations

- All events are cryptographically signed using secp256k1
- JSON Schema validation prevents malformed data
- Deterministic event processing ensures consistency
- Connection security with proper error handling

## Performance Optimizations

- Zero-copy JSON operations where possible
- Efficient sorting algorithms for conflict resolution
- Connection pooling for relay communication
- Concurrent event processing with goroutines

## Contributing

When contributing to this implementation:

1. Follow Go conventions and best practices
2. Add comprehensive tests for new features
3. Use `go fmt` and `go vet` for code quality
4. Ensure thread safety for concurrent operations
5. Update documentation for API changes

## License

This reference implementation is provided as example code for the NSM protocol specification.