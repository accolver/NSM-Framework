# NSM Framework - Development Services Guide

## Enhanced Development Experience

The NSM Framework now provides enhanced service URL logging and discovery to help developers quickly identify and access all running services during development.

## Available Services

### Web Applications
- **POC Whiteboard**: http://localhost:5173 - Interactive whiteboard demo
- **POC Wordle**: http://localhost:5174 - Word game demo
- **Dev Tools App**: http://localhost:3001 - Development utilities dashboard
- **Docs (future)**: http://localhost:3000 - Mintlify documentation site

### TypeScript Libraries (Watch Mode)
- **@nsm/core**: Core protocol implementation
- **@nsm/client**: Client SDK with NDK integration
- **@nsm/client-sdk**: Client SDK API
- **@nsm/dev-tools**: Development utilities
- **@nsm/crypto**: Cryptography library with test watch

## Commands

### Start All Services
```bash
make dev
```
Shows service discovery information and starts all development services with enhanced URL logging.

### Check Service Status
```bash
make services
```
Displays the current status of all development services, showing which are running and their URLs.

### View All Commands
```bash
make help
```
Shows all available make commands including the new monitoring commands.

## Features

### Enhanced URL Logging
- Clear service discovery display at startup
- Consistent formatting across all services
- Quick access URLs for immediate navigation
- Status indicators for running/stopped services

### Service Status Monitoring
- Real-time port checking for web applications
- Process detection for TypeScript watch services
- Health check endpoints for service verification
- Quick troubleshooting information

### Development Workflow
1. Run `make dev` to start all services
2. View the service URLs in the startup output
3. Use `make services` to check status anytime
4. Navigate to the provided URLs to access applications

## Implementation Details

### Enhanced Scripts
- `scripts/dev-enhanced.sh`: Enhanced development startup with URL logging
- `scripts/service-status.sh`: Service status checking utility
- `scripts/dev-quiet.sh`: Original quiet development script (preserved)

### Service Configuration
- **Vite services** (Whiteboard, Wordle): Custom plugins for URL logging
- **Bun service** (Dev Tools): HTTP server with health endpoints
- **TypeScript services**: Watch mode compilation with status detection

### Port Assignments
- 3000: Documentation (Mintlify, future)
- 3001: Development Tools App
- 5173: POC Whiteboard
- 5174: POC Wordle

## Benefits for Developers

1. **Quick Service Discovery**: Immediately see where all services are running
2. **Status Monitoring**: Check service health without manual port checking
3. **Consistent Experience**: Uniform URL logging across all service types
4. **Reduced Context Switching**: All information available in terminal output
5. **Troubleshooting Support**: Clear indicators of running vs. stopped services

## Maintenance

The service URLs and configurations are maintained in:
- `Makefile`: Main commands and help text
- `vite.config.js/ts`: Vite application configurations
- `package.json` files: Service development scripts
- Custom plugins: URL logging and health check implementations

This enhanced development setup significantly improves the developer experience by providing clear visibility into the development environment state.