# NDK (Nostr Dev Kit) Research

## Overview
NDK is a high-level TypeScript library for building Nostr applications. It provides abstractions over the low-level nostr-tools library with better developer experience and built-in best practices.

## Key Features for NSM Framework
- **Subscription Management**: Auto-grouping and connection management
- **Caching Adapters**: Built-in support for IndexedDB and other storage
- **Relay Discovery**: Intelligent relay selection and management
- **Event Validation**: Built-in event validation and signing
- **NIP Support**: Extensive support for Nostr Implementation Possibilities

## Core Classes and Patterns
```typescript
import NDK, { NDKEvent, NDKFilter } from '@nostr-dev-kit/ndk';

// Initialize NDK instance
const ndk = new NDK({
  explicitRelayUrls: ["wss://relay.damus.io", "wss://nos.lol"],
  cacheAdapter: new NDKCacheAdapterDexie()
});

// Create and publish events
const event = new NDKEvent(ndk, {
  kind: 30079, // NSM Definition Event
  content: JSON.stringify(machineDefinition),
  tags: [
    ['d', 'wordle-v1'],
    ['name', 'Nostr Wordle'],
    ['engine', 'xstate@5']
  ]
});

await event.publish();

// Subscribe to events
const filter: NDKFilter = {
  kinds: [30079], // NSM Definition Events
  '#d': ['wordle-v1']
};

const subscription = ndk.subscribe(filter);
subscription.on('event', handleNSMDefinition);
```

## Integration Patterns
- Use `NDKUser` for identity management and key handling
- Leverage `NDKRelay` for direct relay communication when needed
- Implement custom event kinds using NDK's extensible event system
- Use `NDKSubscription` for real-time event streaming

## Performance Optimizations
- Batch event operations using `NDKPool`
- Implement proper event deduplication
- Use NDK's built-in caching for frequently accessed events
- Optimize relay selection based on user preferences