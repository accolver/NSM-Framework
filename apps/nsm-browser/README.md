# NSM Browser

A modern web UI for browsing and publishing Nostr State Machines built with React, TypeScript, and Vite.

## Features

### 🔍 Browse Tab
- **Discover state machines** published on Nostr relays (kind:30079 events)
- **View details** including app name, description, author, and timestamp
- **Expand JSON** to view the complete XState machine definition
- **Copy JSON** to clipboard for use in your projects
- **Real-time refresh** to fetch latest published machines

### 📝 Publish Tab
- **Create new state machines** with an intuitive form interface
- **JSON validation** ensures XState format compliance
- **Rich example** shows a complete toggle machine with context and actions
- **Error handling** with clear validation messages
- **Nostr integration** for publishing kind:30079 events

### 🔌 Nostr Integration
- **Multi-relay support** (Damus, nos.lol, relay.nostr.band)
- **NIP-07 wallet support** for browser extension signing
- **Connection status** indicator with retry functionality
- **Event validation** using NSM core protocols

## Tech Stack

- **React 18** with TypeScript for type safety
- **Vite** for fast development and building
- **NSM Client** for Nostr State Machine protocols
- **Modern CSS** with custom properties and responsive design
- **Vitest** for testing with TDD approach
- **Bun** as the runtime and package manager

## Quick Start

### Prerequisites
- Bun v1.0.0 or higher
- Node.js 18+ (for compatibility)

### Installation
```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Open browser to http://localhost:5175
```

### Available Scripts
```bash
# Development
bun run dev          # Start dev server on port 5175
bun run build        # Build for production
bun run preview      # Preview production build

# Testing
bun test             # Run all tests
bun test:watch       # Run tests in watch mode
bun test:ui          # Run tests with UI

# Code Quality
bun run lint         # ESLint checking
bun run format       # Prettier formatting
bun run type-check   # TypeScript checking
```

## Project Structure

```
src/
├── components/          # React components
│   ├── BrowseTab.tsx   # Browse published machines
│   ├── PublishForm.tsx # Publish new machines
│   └── BrowseTab.tsx   # Application browsing
├── hooks/              # Custom React hooks
│   └── useNSMClient.ts # NSM client management
├── utils/              # Utility functions
│   ├── xstate-validator.ts # XState JSON validation
│   └── nostr-events.ts     # Nostr event handling
├── __tests__/          # Test files
├── styles.css          # Global styles
├── App.tsx            # Main application
└── main.tsx           # Entry point
```

## XState Machine Format

The NSM Browser expects XState machines in JSON format with these properties:

```json
{
  "id": "machine-name",
  "initial": "initial-state",
  "context": {
    "count": 0
  },
  "states": {
    "initial-state": {
      "on": {
        "EVENT": "next-state"
      }
    },
    "next-state": {
      "on": {
        "EVENT": "initial-state"
      }
    }
  }
}
```

### Required Properties
- `states`: Object containing state definitions
- At least one state in the states object

### Optional Properties
- `id`: Machine identifier
- `initial`: Name of the initial state
- `context`: Initial context data
- `actions`: Action definitions

## Nostr Event Structure

Published machines use kind:30079 events with these tags:

- `d`: Unique identifier
- `name`: Human-readable app name
- `description`: App description
- `engine`: "xstate"
- `engineCodeURI`: URI to XState documentation

Content contains the state machine JSON in this format:
```json
{
  "initialState": { /* XState machine definition */ }
}
```

## Testing

The project uses Test-Driven Development (TDD) with Vitest:

### Core Test Categories
1. **XState Validation Tests** - JSON parsing and validation logic
2. **Nostr Event Tests** - Event creation and parsing
3. **Component Tests** - React component functionality
4. **Integration Tests** - End-to-end workflows

### Running Tests
```bash
# Core utility tests (always passing)
bun test src/__tests__/xstate-validator.test.ts src/__tests__/nostr-events.test.ts

# All tests
bun test

# Watch mode
bun test:watch
```

## Development

### Adding New Features
1. Write failing tests first (RED phase)
2. Implement minimal code to pass tests (GREEN phase)
3. Refactor and improve while keeping tests green (REFACTOR phase)

### Code Style
- TypeScript for type safety
- Modern React with hooks
- CSS custom properties for theming
- Mobile-first responsive design
- Semantic HTML with ARIA attributes

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers with ES2020 support

## Contributing

1. Ensure tests pass: `bun test`
2. Follow code style: `bun run lint && bun run format`
3. Type check: `bun run type-check`
4. Test in browser: `bun run dev`

## License

Part of the NSM Framework - see main project for license details.