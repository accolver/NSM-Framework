# @nsm/core

Core NSM (Nostr State Machine) Protocol Implementation

This package provides TypeScript interfaces and validation utilities for the Nostr State Machine (NSM) protocol events.

## Installation

```bash
bun add @nsm/core
```

## Overview

The NSM protocol defines three event kinds for building state machines on Nostr:

- **Kind 30079**: NSM Definition Events (parameterized replaceable)
- **Kind 7000-7999**: NSM Interaction Events (regular immutable)
- **Kind 10079**: NSM State Update Events (replaceable)

## Usage

### NSM Definition Event (kind: 30079)

Define a state machine application:

```typescript
import { createNSMDefinitionEvent, validateNSMDefinitionEvent } from "@nsm/core";

const metadata = {
  identifier: "wordle-v1",
  name: "Wordle Game",
  engine: "xstate",
  engineCodeURI: "https://example.com/wordle-engine.js",
  uiSpec: "react",
  version: "1.0.0"
};

const content = {
  initialState: {
    currentGuess: "",
    guesses: [],
    gameStatus: "playing"
  },
  stateSchema: {
    type: "object",
    properties: {
      currentGuess: { type: "string" },
      guesses: { type: "array", items: { type: "string" } },
      gameStatus: { type: "string", enum: ["playing", "won", "lost"] }
    },
    required: ["currentGuess", "guesses", "gameStatus"]
  },
  interactionSchema: {
    type: "object",
    properties: {
      type: { type: "string", enum: ["KEYPRESS", "SUBMIT_GUESS"] },
      key: { type: "string" },
      guess: { type: "string" }
    }
  }
};

const event = createNSMDefinitionEvent(metadata, content);
// Add id, pubkey, created_at, sig before publishing

const validation = validateNSMDefinitionEvent(event);
if (validation.success) {
  console.log("Valid NSM Definition event");
}
```

### NSM Interaction Event (kind: 7000-7999)

Create user interaction events:

```typescript
import { createNSMInteractionEvent, validateNSMInteractionEvent } from "@nsm/core";

const appAddress = "30079:creator-pubkey:wordle-v1";
const content = {
  type: "KEYPRESS",
  payload: { key: "A" },
  metadata: {
    timestamp: Date.now(),
    sessionId: "game-session-123"
  }
};

const event = createNSMInteractionEvent(appAddress, content, {
  participants: ["player1-pubkey"]
});
// Add id, pubkey, created_at, sig before publishing

const validation = validateNSMInteractionEvent(event);
if (validation.success) {
  console.log("Valid NSM Interaction event");
}
```

### NSM State Update Event (kind: 10079)

Publish state snapshots:

```typescript
import { createNSMStateUpdateEvent, validateNSMStateUpdateEvent } from "@nsm/core";

const appAddress = "30079:creator-pubkey:wordle-v1";
const content = {
  state: {
    currentGuess: "HELLO",
    guesses: ["CRANE", "BLUNT"],
    gameStatus: "playing"
  },
  metadata: {
    stateVersion: 5,
    lastInteractionId: "interaction-abc123",
    timestamp: Date.now()
  }
};

const event = createNSMStateUpdateEvent(appAddress, content, {
  participants: ["player1-pubkey"],
  arbiter: "arbiter-pubkey"
});
// Add id, pubkey, created_at, sig before publishing

const validation = validateNSMStateUpdateEvent(event);
if (validation.success) {
  console.log("Valid NSM State Update event");
}
```

### Generic Event Validation

Validate any NSM event:

```typescript
import { validateNSMEvent } from "@nsm/core";

const result = validateNSMEvent(someEvent);
if (result.success) {
  console.log(`Valid ${result.eventType} event`);
  // result.data contains the validated event
} else {
  console.error("Validation failed:", result.error);
}
```

### Conflict Resolution

Resolve conflicts between state update events:

```typescript
import { resolveConflict } from "@nsm/core";

const conflictingEvents = [stateUpdate1, stateUpdate2, stateUpdate3];

// Timestamp-based resolution (most recent wins)
const winner1 = resolveConflict(conflictingEvents, "timestamp-based");

// ID-based resolution (lexically smallest ID wins)
const winner2 = resolveConflict(conflictingEvents, "id-based");

// Owner-based resolution (app owner's updates take precedence)
const winner3 = resolveConflict(conflictingEvents, "owner-based", "owner-pubkey");
```

### JSON Schema Validation

Validate data against JSON schemas:

```typescript
import { validateJSONSchema } from "@nsm/core";

const schema = {
  type: "object",
  properties: {
    name: { type: "string" },
    age: { type: "number", minimum: 0 }
  },
  required: ["name", "age"]
};

const data = { name: "Alice", age: 30 };
const result = validateJSONSchema(data, schema);

if (result.success) {
  console.log("Data is valid");
} else {
  console.error("Validation failed:", result.error);
}
```

### Event Serialization

Serialize and deserialize NSM events:

```typescript
import { serializeNSMEvent, deserializeNSMEvent } from "@nsm/core";

// Serialize event to JSON string
const serialized = serializeNSMEvent(event);

// Deserialize and validate JSON string
const deserialized = deserializeNSMEvent(serialized);
if (deserialized.success) {
  console.log("Successfully deserialized event");
}
```

## Protocol Constants

```typescript
import { NSM_PROTOCOL, isNSMEventKind, getNSMEventType } from "@nsm/core";

console.log(NSM_PROTOCOL.DEFINITION_KIND); // 30079
console.log(NSM_PROTOCOL.INTERACTION_KIND_MIN); // 7000
console.log(NSM_PROTOCOL.INTERACTION_KIND_MAX); // 7999
console.log(NSM_PROTOCOL.STATE_UPDATE_KIND); // 10079

// Check if event kind is valid NSM kind
if (isNSMEventKind(7001)) {
  console.log("Valid NSM event kind");
}

// Get event type from kind
const eventType = getNSMEventType(30079); // "definition"
```

## Type Safety

All interfaces provide full TypeScript type safety:

```typescript
import type {
  INSMDefinitionEvent,
  INSMInteractionEvent,
  INSMStateUpdateEvent,
  NSMDefinitionContent,
  NSMInteractionContent,
  NSMStateUpdateContent,
  ConflictResolutionPolicy
} from "@nsm/core";

// Compile-time type checking ensures correct event structure
const definitionEvent: INSMDefinitionEvent = {
  id: "event-id",
  pubkey: "event-creator-pubkey",
  created_at: Math.floor(Date.now() / 1000),
  kind: 30079, // Must be exactly 30079
  tags: [
    ["d", "app-identifier"],
    ["name", "App Name"],
    ["engine", "xstate"],
    ["engineCodeURI", "https://example.com/engine.js"]
  ],
  content: JSON.stringify({
    initialState: {},
    stateSchema: { type: "object" },
    interactionSchema: { type: "object" }
  }),
  sig: "event-signature"
};
```

## Development

```bash
# Install dependencies
bun install

# Run tests
bun test

# Run tests in watch mode
bun test --watch

# Build package
bun run build

# Type check
bun run typecheck
```

## License

MIT