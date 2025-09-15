# NSM Integration for Wordle Application

This document describes the NSM (Nostr State Machine) integration implemented for the Wordle proof-of-concept application as part of Task 5.3.

## Overview

The NSM integration enables distributed state management for the Wordle game using the Nostr protocol. This allows multiple instances of the game to synchronize state in real-time across different clients and sessions.

## Architecture

### Core Components

1. **NSM Definition Event** (`createWordleNSMDefinition`)
   - Defines the Wordle application schema for the NSM network
   - Specifies initial state, state schema, and interaction schema
   - Published as Nostr event kind 30079

2. **NSM Connector** (`WordleNSMConnector`)
   - Bridges XState machine with NSM client
   - Handles bidirectional state synchronization
   - Provides error handling and rate limiting

3. **React Integration** (`NSMWordleApp`)
   - Production-ready React component with NSM integration
   - Displays connection status and error states
   - Configurable for different deployment scenarios

### Protocol Integration

#### Event Types Used

- **Kind 30079**: NSM Definition Event
  - Application schema and metadata
  - State machine definition
  - Interaction protocols

- **Kind 7000-7999**: NSM Interaction Events
  - User actions (KEYPRESS, BACKSPACE, SUBMIT_GUESS, RESET_GAME)
  - Published when users interact with the game

- **Kind 10079**: NSM State Update Events
  - Current game state snapshots
  - Synchronized across all connected instances

#### State Schema

```typescript
{
  value: 'playing' | 'won' | 'lost',
  context: {
    hiddenWord: string,      // 5-letter target word
    guesses: Array<{
      word: string,          // 5-letter guess
      letterStatus: Array<'correct' | 'present' | 'absent'>
    }>,
    currentGuess: string,    // Current partial guess
    attemptNumber: number,   // 0-6
    gameOver: boolean
  }
}
```

#### Interaction Schema

```typescript
{
  action: 'KEYPRESS' | 'BACKSPACE' | 'SUBMIT_GUESS' | 'RESET_GAME',
  payload: {
    letter?: string  // For KEYPRESS actions
  }
}
```

## Implementation Details

### TDD Approach

The integration was implemented using Test-Driven Development:

1. **RED Phase**: Created 5 failing tests for essential functionality
2. **GREEN Phase**: Implemented minimal code to pass tests
3. **REFACTOR Phase**: Added error handling, validation, and optimization

### Key Features

#### Error Handling
- Automatic disconnection after 5 consecutive publish errors
- Error count reset after 1-minute timeout
- Rate limiting to prevent message spam (1-second throttle)
- Input validation for all incoming state updates

#### Performance Optimization
- Throttled state publishing to reduce network traffic
- Optimistic updates for responsive UI
- Connection status monitoring
- Graceful degradation when NSM is unavailable

#### Security
- Input validation for all state updates
- Private key management for testing
- Sandboxed state machine execution (inherited from NSMStateMachine)

## Usage

### Basic Integration

```typescript
import { NSMWordleApp } from './components/NSMWordleApp';

// Standard Wordle (no NSM)
<NSMWordleApp enableNSM={false} />

// NSM-enabled Wordle
<NSMWordleApp
  enableNSM={true}
  relayUrls={['wss://relay.damus.io']}
  privateKey="your-private-key-hex"
/>
```

### Programmatic API

```typescript
import { createWordleNSMDefinition, WordleNSMConnector } from './nsm-integration';
import { NSMClient } from '@nsm/client';

// Create NSM definition
const definition = await createWordleNSMDefinition();

// Initialize client and connector
const client = new NSMClient({
  relayUrls: ['wss://relay.damus.io'],
  privateKey: 'your-private-key'
});

const connector = new WordleNSMConnector(client, wordleActor);
await connector.initialize();

// Monitor connection status
const status = connector.getConnectionStatus();
console.log('Connected:', status.isConnected);
console.log('Error count:', status.errorCount);
```

## Testing

### Test Coverage

The integration includes comprehensive tests covering:

1. **NSM Definition Creation**: Validates application schema generation
2. **Client Initialization**: Tests connection and setup
3. **Interaction Publishing**: Verifies event publishing on user actions
4. **State Synchronization**: Tests bidirectional state updates
5. **Multi-instance Sync**: Validates distributed state management
6. **React Component**: Tests UI integration and error handling

### Running Tests

```bash
cd apps/poc-wordle
bun test                          # All tests
bun test nsm-integration.test.ts  # NSM integration tests only
bun test NSMWordleApp.test.tsx    # React component tests
```

## Configuration

### Environment Variables

- `NODE_ENV=development`: Enables NSM demo mode in the main app
- Private keys should be provided via secure environment variables in production

### Relay Configuration

Default relays:
- `wss://relay.damus.io`
- `wss://nos.lol`
- `wss://relay.nostr.band`

Custom relays can be specified via the `relayUrls` prop.

## Future Enhancements

### Planned Features

1. **Conflict Resolution**: Advanced algorithms for handling simultaneous state changes
2. **Offline Support**: State caching and synchronization when reconnecting
3. **Game Rooms**: Multi-user collaborative gameplay
4. **Spectator Mode**: Real-time observation of other players' games
5. **Tournament Integration**: Competitive gameplay with scoring

### Performance Improvements

1. **State Compression**: Reduce bandwidth usage for large state objects
2. **Selective Synchronization**: Only sync relevant state changes
3. **Connection Pooling**: Optimize relay connections
4. **Caching Strategy**: Intelligent state caching and invalidation

## Dependencies

### Core Dependencies
- `@nsm/client`: NSM client implementation
- `@nsm/core`: Protocol definitions and utilities
- `@nostr-dev-kit/ndk`: Nostr protocol implementation
- `xstate`: State machine library
- `react`: UI framework

### Development Dependencies
- `bun`: Test runner and build tool
- `@testing-library/react`: React component testing
- `typescript`: Type safety

## Architecture Benefits

### Distributed State Management
- No central server required
- Censorship-resistant
- Real-time synchronization
- Cross-platform compatibility

### Developer Experience
- Type-safe interfaces
- Comprehensive error handling
- Easy integration with existing React apps
- Extensive test coverage

### Scalability
- P2P architecture scales naturally
- No bandwidth limitations from central servers
- Relay diversity for redundancy
- Efficient state distribution

## Conclusion

The NSM integration successfully demonstrates distributed state management for interactive applications using the Nostr protocol. The implementation provides a robust foundation for building decentralized games and collaborative applications while maintaining excellent developer experience and performance characteristics.

The TDD approach ensured high code quality and comprehensive test coverage, while the modular architecture allows for easy extension and customization. The integration serves as a proof-of-concept for the broader NSM framework and validates the technical approach for distributed state management in web applications.