# NSM Protocol Reference Implementations

This directory contains reference implementations of the Nostr State Machine (NSM) protocol in multiple programming languages to demonstrate cross-language interoperability and provide starting points for developers.

## Available Implementations

### Python (`python/`)
- **Library**: python-nostr
- **Features**: Complete NSM protocol support with event validation, cryptographic signing, and relay communication
- **Use Case**: Server-side applications, data processing, and CLI tools

### Go (`go/`)
- **Library**: go-nostr
- **Features**: High-performance NSM implementation with concurrent event processing
- **Use Case**: High-throughput applications, relay implementations, and system services

### TypeScript (`../packages/`)
- **Library**: @nsm/core, @nsm/client, @nsm/crypto
- **Features**: Full-featured implementation with browser and Node.js support
- **Use Case**: Web applications, browser extensions, and Node.js services

## Quick Start

Each implementation includes:
- Core NSM event types (30079, 7000-7999, 10079)
- Event validation against JSON schemas
- Cryptographic signing and verification
- Relay communication
- Simple example applications

### Python Implementation
```bash
cd python/
pip install -r requirements.txt
python example_counter.py
```

### Go Implementation
```bash
cd go/
go mod tidy
go run nsm.go
```

### TypeScript Implementation
```bash
cd ../packages/client/
npm run example:counter
```

## Cross-Language Testing

The `tests/` directory contains comprehensive interoperability tests to ensure all implementations can work together seamlessly.

```bash
cd tests/
npm install
node interoperability-test.js
```

## Implementation Comparison

| Feature | Python | Go | TypeScript |
|---------|--------|----|-----------|
| **Performance** | Good | Excellent | Very Good |
| **Concurrency** | asyncio | goroutines | async/await |
| **Use Cases** | CLI tools, servers | High-throughput | Web apps, Node.js |
| **Dependencies** | python-nostr | go-nostr | @nsm/* packages |
| **Platform** | Cross-platform | Cross-platform | Web + Node.js |

## Architecture Overview

All implementations follow the same architectural patterns:

```
NSMClient
├── NSMEventFactory    (Event creation and signing)
├── NSMEventValidator  (JSON schema validation)
├── NSMConflictResolver (Deterministic conflict resolution)
└── RelayManager       (WebSocket communication)
```

### Core Components

1. **Event Factory**: Creates and signs NSM events
   - Deterministic kind calculation for interactions
   - Cryptographic signing with secp256k1
   - Address generation and management

2. **Event Validator**: Validates events against schemas
   - JSON Schema validation
   - Protocol compliance checking
   - Comprehensive error reporting

3. **Conflict Resolver**: Handles conflicting events
   - Timestamp-based resolution
   - Owner-based precedence
   - Deterministic ordering

4. **Relay Manager**: Communicates with Nostr relays
   - WebSocket connection management
   - Event publishing and subscription
   - Connection pooling and retry logic

## Contributing

When adding a new language implementation:
1. Follow the existing directory structure
2. Implement all core NSM event types
3. Include validation and cryptographic functions
4. Add example applications
5. Update cross-language tests