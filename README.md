# NSM Framework

**Nostr State Machine Framework** - Building deterministic, multi-user applications on Nostr

## Overview

NSM is a framework for building collaborative applications on the Nostr protocol using state machines. It enables developers to create applications where multiple users can interact with shared state in a deterministic and verifiable way.

## Architecture

The NSM framework consists of:

- **Core Protocol** (`@nsm/core`) - Event definitions and TypeScript interfaces
- **Client SDK** (`@nsm/client-sdk`) - Main SDK for building NSM applications
- **Developer Tools** (`@nsm/dev-tools`) - Debugging and development utilities
- **Proof of Concepts** - Wordle and Collaborative Whiteboard demos

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) >= 1.0.0
- Node.js >= 18 (for compatibility)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd nsm-framework

# Install dependencies
bun install

# Build all packages
bun run build

# Run development mode
bun run dev
```

### Project Structure

```
nsm-framework/
├── packages/
│   ├── nsm-core/           # Core protocol definitions
│   ├── nsm-client-sdk/     # Main client SDK
│   └── nsm-dev-tools/      # Development utilities
├── apps/
│   ├── poc-wordle/         # Wordle proof of concept
│   ├── poc-whiteboard/     # Whiteboard proof of concept
│   ├── dev-tools/          # Developer tools UI
│   └── docs/               # Documentation site
└── tools/
    └── eslint-config/      # Shared linting configuration
```

## Development

### Available Scripts

```bash
# Build all packages
bun run build

# Start development servers
bun run dev

# Run tests
bun run test

# Run linting
bun run lint

# Format code
bun run format

# Type checking
bun run type-check

# Clean build artifacts
bun run clean
```

### Technology Stack

- **Runtime**: Bun (high performance JavaScript runtime)
- **Monorepo**: Turborepo (for managing multiple packages)
- **Language**: TypeScript (with full type safety)
- **Protocol**: Nostr (decentralized communication)
- **State Management**: XState (state machines)
- **Storage**: Blossom (large file storage)

## Protocol Overview

NSM uses three new Nostr event kinds:

- **Kind 30079**: NSM Definition Events (parameterized replaceable)
- **Kind 7000-7999**: NSM Interaction Events (regular)
- **Kind 10079**: NSM State Update Events (replaceable)

## Examples

### Basic Usage

```typescript
import { NSMClient } from '@nsm/client-sdk';

// Initialize client
const client = new NSMClient();
await client.initialize();

// Create a state machine application
// (Full examples will be available after Task 3-6 completion)
```

## Roadmap

- [x] **Task 1**: Project Foundation and Monorepo Setup
- [ ] **Task 2**: Core NSM Protocol Implementation
- [ ] **Task 3**: Client SDK Development
- [ ] **Task 4**: Blossom Integration
- [ ] **Task 5**: Wordle Proof of Concept
- [ ] **Task 6**: Collaborative Whiteboard
- [ ] **Task 7**: Developer Tools
- [ ] **Task 8**: Documentation Site
- [ ] **Task 9**: Testing Infrastructure
- [ ] **Task 10**: Security Implementation
- [ ] **Task 11**: Performance Optimization
- [ ] **Task 12**: Community Engagement

## Contributing

This is currently in early development. Contribution guidelines will be added as the project matures.

## License

MIT License - see LICENSE file for details.

## Links

- [Nostr Protocol](https://nostr.com/)
- [XState Documentation](https://xstate.js.org/)
- [Bun Documentation](https://bun.sh/docs)
- [Turborepo Documentation](https://turbo.build/)

---

Built with ❤️ using Bun and the Nostr protocol