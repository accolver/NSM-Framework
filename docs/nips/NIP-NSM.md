# NIP-NSM: Nostr State Machine Protocol

`draft` `optional`

## Abstract

This NIP defines the Nostr State Machine (NSM) protocol, which enables building deterministic, collaborative state machines on Nostr. The NSM protocol allows multiple users to participate in shared application states with automatic conflict resolution, real-time synchronization, and cryptographic integrity verification.

## Motivation

Nostr's event-driven architecture provides an excellent foundation for building collaborative applications, but lacks a standardized way to handle complex state management and multi-user coordination. Current approaches either require centralized servers or result in inconsistent application states across users.

The NSM protocol solves these challenges by providing:

- **Deterministic State Management**: All participants converge to the same application state
- **Conflict Resolution**: Built-in strategies for handling simultaneous state changes
- **Sandboxed Execution**: Secure execution of untrusted application logic
- **Real-time Collaboration**: Live synchronization across multiple users
- **Protocol Compliance**: Full integration with existing Nostr infrastructure

## Event Kinds

The NSM protocol introduces three new event kinds:

| Kind | Name | Type | Description |
|------|------|------|-------------|
| 30079 | NSM Definition | Parameterized Replaceable | Application schema and state machine definition |
| 7000-7999 | NSM Interaction | Regular | User actions and state machine events |
| 10079 | NSM State Update | Replaceable | Canonical state snapshots with conflict resolution |

## Specification

### NSM Definition Event (Kind 30079)

NSM Definition Events define the structure and behavior of a state machine application.

**Required Tags:**
- `d`: Application identifier (parameterized replaceable key)
- `name`: Human-readable application name
- `engine`: State machine engine identifier (e.g., "xstate")
- `engineCodeURI`: URI to state machine implementation (Blossom hash recommended)

**Optional Tags:**
- `description`: Application description
- `version`: Application version
- `author`: Application author information
- `license`: License information

**Content Structure:**
```json
{
  "initialState": {},
  "stateSchema": {
    "type": "object",
    "properties": {},
    "required": []
  },
  "interactionSchema": {
    "type": "object",
    "properties": {
      "type": {
        "type": "string",
        "enum": ["ACTION_TYPE_1", "ACTION_TYPE_2"]
      }
    },
    "required": ["type"]
  }
}
```

**Example:**
```json
{
  "kind": 30079,
  "content": "{\"initialState\":{\"todos\":[],\"nextId\":1},\"stateSchema\":{\"type\":\"object\",\"properties\":{\"todos\":{\"type\":\"array\"},\"nextId\":{\"type\":\"number\"}},\"required\":[\"todos\",\"nextId\"]},\"interactionSchema\":{\"type\":\"object\",\"properties\":{\"type\":{\"type\":\"string\",\"enum\":[\"ADD_TODO\",\"TOGGLE_TODO\",\"DELETE_TODO\"]}},\"required\":[\"type\"]}}",
  "tags": [
    ["d", "collaborative-todo"],
    ["name", "Collaborative Todo App"],
    ["engine", "xstate"],
    ["engineCodeURI", "blossom://da39a3ee5e6b4b0d3255bfef95601890afd80709"],
    ["description", "A collaborative todo list application"],
    ["version", "1.0.0"]
  ],
  "pubkey": "...",
  "created_at": 1234567890,
  "id": "...",
  "sig": "..."
}
```

### NSM Interaction Event (Kind 7000-7999)

NSM Interaction Events represent user actions that trigger state machine transitions.

**Kind Assignment:** Deterministic hash-based assignment within the 7000-7999 range based on the application address to prevent conflicts.

**Required Tags:**
- `a`: Address to Definition event (format: "30079:pubkey:identifier")

**Optional Tags:**
- `p`: Participant pubkeys (for multi-user applications)

**Content Structure:**
```json
{
  "type": "ACTION_TYPE",
  "payload": {},
  "metadata": {
    "timestamp": 1234567890,
    "sessionId": "session-id",
    "userId": "user-id"
  }
}
```

**Example:**
```json
{
  "kind": 7042,
  "content": "{\"type\":\"ADD_TODO\",\"payload\":{\"text\":\"Buy groceries\",\"id\":1},\"metadata\":{\"timestamp\":1234567890,\"sessionId\":\"session-123\"}}",
  "tags": [
    ["a", "30079:npub1abc123:collaborative-todo"],
    ["p", "npub1user123"]
  ],
  "pubkey": "...",
  "created_at": 1234567890,
  "id": "...",
  "sig": "..."
}
```

### NSM State Update Event (Kind 10079)

NSM State Update Events provide canonical state snapshots with conflict resolution metadata.

**Required Tags:**
- `a`: Address to Definition event

**Optional Tags:**
- `p`: Participant pubkeys
- `arbiter`: Designated state arbiter pubkey

**Content Structure:**
```json
{
  "state": {},
  "metadata": {
    "stateVersion": 1,
    "lastInteractionId": "event-id",
    "conflictResolution": "timestamp-based",
    "participants": ["pubkey1", "pubkey2"],
    "checksum": "sha256-hash"
  }
}
```

**Example:**
```json
{
  "kind": 10079,
  "content": "{\"state\":{\"todos\":[{\"id\":1,\"text\":\"Buy groceries\",\"completed\":false}],\"nextId\":2},\"metadata\":{\"stateVersion\":2,\"lastInteractionId\":\"abc123\",\"conflictResolution\":\"timestamp-based\"}}",
  "tags": [
    ["a", "30079:npub1abc123:collaborative-todo"],
    ["p", "npub1user123"],
    ["p", "npub1user456"]
  ],
  "pubkey": "...",
  "created_at": 1234567890,
  "id": "...",
  "sig": "..."
}
```

## Conflict Resolution

The NSM protocol supports multiple conflict resolution strategies:

### 1. Timestamp-Based Resolution
Most recent event wins, with event ID as tiebreaker:
```javascript
function resolveConflict(events) {
  return events.sort((a, b) => {
    if (a.created_at !== b.created_at) {
      return b.created_at - a.created_at; // Most recent wins
    }
    return a.id.localeCompare(b.id); // ID tie-breaker
  })[0];
}
```

### 2. Owner-Based Resolution
Application owner's events have precedence, with timestamp fallback.

### 3. Arbiter-Based Resolution
Designated arbiter resolves conflicts through additional state update events.

## Security Considerations

### Sandboxed Execution
- All state machine code MUST be executed in a secure sandbox
- Untrusted code MUST NOT have access to global objects or native APIs
- Resource limits MUST be enforced (CPU time, memory usage)

### Input Validation
- All event content MUST be validated against JSON schemas
- Large payloads SHOULD be rejected to prevent DoS attacks
- Rate limiting SHOULD be implemented per pubkey

### Cryptographic Integrity
- All events MUST be cryptographically signed and verified
- Blossom content MUST be verified using SHA-256 hashes
- State checksums SHOULD be included for integrity verification

## Implementation Requirements

### Client Requirements
- MUST validate all event structures according to this specification
- MUST implement at least one conflict resolution strategy
- SHOULD implement sandboxed execution for state machine code
- SHOULD cache state machine definitions and frequently accessed states

### Relay Requirements
- MAY implement NSM-specific filtering and indexing
- SHOULD support efficient querying of NSM events by application address
- MAY implement conflict resolution at the relay level

## Examples

### Simple Counter Application

**Definition Event:**
```json
{
  "kind": 30079,
  "content": "{\"initialState\":{\"count\":0},\"stateSchema\":{\"type\":\"object\",\"properties\":{\"count\":{\"type\":\"number\"}},\"required\":[\"count\"]},\"interactionSchema\":{\"type\":\"object\",\"properties\":{\"type\":{\"type\":\"string\",\"enum\":[\"INCREMENT\",\"DECREMENT\"]}},\"required\":[\"type\"]}}",
  "tags": [
    ["d", "simple-counter"],
    ["name", "Simple Counter"],
    ["engine", "xstate"]
  ]
}
```

**Interaction Event:**
```json
{
  "kind": 7001,
  "content": "{\"type\":\"INCREMENT\",\"payload\":{}}",
  "tags": [["a", "30079:npub1abc123:simple-counter"]]
}
```

**State Update Event:**
```json
{
  "kind": 10079,
  "content": "{\"state\":{\"count\":1},\"metadata\":{\"stateVersion\":1,\"conflictResolution\":\"timestamp-based\"}}",
  "tags": [["a", "30079:npub1abc123:simple-counter"]]
}
```

## Reference Implementation

A complete TypeScript implementation is available at:
- **Core Protocol**: `@nsm/core` package
- **Client SDK**: `@nsm/client` package
- **Cryptographic Utilities**: `@nsm/crypto` package

Source code: https://github.com/sovereigntechstudios/nsm

## Test Vectors

The reference implementation includes comprehensive test vectors covering:
- Event validation (63 test cases)
- Conflict resolution scenarios
- Security boundary testing
- Multi-user collaboration workflows
- Performance benchmarks

## Rationale

The NSM protocol leverages Nostr's strengths while addressing key limitations:

1. **Event-Driven Architecture**: Natural fit for state machine transitions
2. **Decentralized Infrastructure**: No single point of failure
3. **Cryptographic Security**: Built-in authentication and integrity
4. **Extensible Design**: Support for any state machine implementation
5. **Backwards Compatibility**: Optional protocol that doesn't break existing clients

## Future Extensions

Potential future NIPs could extend NSM with:
- Byzantine fault tolerance for critical applications
- Optimistic conflict resolution with rollback capabilities
- Economic incentives for state arbiters
- Advanced privacy features using NIPs 17 and 44

## References

- [NIP-01: Basic Protocol](https://github.com/nostr-protocol/nips/blob/master/01.md)
- [NIP-16: Replaceable Events](https://github.com/nostr-protocol/nips/blob/master/16.md)
- [NIP-33: Parameterized Replaceable Events](https://github.com/nostr-protocol/nips/blob/master/33.md)
- [XState State Machine Library](https://xstate.js.org/)
- [Blossom Protocol Specification](https://github.com/hzrd149/blossom)