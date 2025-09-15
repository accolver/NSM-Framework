# Bun Runtime and Toolchain Research

## Overview
Bun is a fast all-in-one JavaScript runtime, bundler, test runner, and package manager. It's designed as a drop-in replacement for Node.js with significantly better performance.

## Key Features for NSM Framework
- **Fast Runtime**: Up to 4x faster than Node.js for many operations
- **Built-in TypeScript**: Native TypeScript support without transpilation
- **Integrated Tooling**: Bundler, test runner, and package manager included
- **Web APIs**: Built-in support for Web APIs like fetch, WebSocket, etc.
- **Hot Reloading**: Fast development server with instant reloads

## Project Configuration
```json
// package.json
{
  "name": "nsm-framework",
  "scripts": {
    "dev": "bun run --watch src/index.ts",
    "build": "bun build src/index.ts --outdir dist --minify",
    "test": "bun test",
    "start": "bun dist/index.js"
  },
  "dependencies": {
    "@nostr-dev-kit/ndk": "^2.0.0",
    "xstate": "^5.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "bun-types": "^1.0.0"
  }
}
```

## Build Configuration (bun build)
```typescript
// build.ts
await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  target: 'browser', // or 'node'
  format: 'esm',
  minify: true,
  sourcemap: 'external',
  splitting: true // for code splitting
});
```

## Testing with Bun
```typescript
// test/nsm-client.test.ts
import { expect, test, describe } from 'bun:test';
import { NSMClient } from '../src/nsm-client';

describe('NSM Client', () => {
  test('should create machine instance', () => {
    const client = new NSMClient();
    const machine = client.createMachine(wordleMachine);
    expect(machine).toBeDefined();
  });
});
```

## Development Server Setup
```typescript
// server.ts
const server = Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === '/api/nsm') {
      return new Response(JSON.stringify({ status: 'ok' }));
    }

    return new Response('NSM Development Server');
  },
});

console.log(`Server running on port ${server.port}`);
```

## Performance Benefits for NSM
- Fast state machine interpretation and execution
- Quick bundling for client SDK distribution
- Rapid test execution for TDD workflows
- Efficient WebSocket handling for Nostr connections

## Integration Patterns
- Use Bun's native fetch for HTTP requests to Blossom servers
- Leverage Bun's WebSocket implementation for Nostr relay connections
- Utilize built-in crypto APIs for event signing and verification
- Take advantage of fast startup times for CLI tools