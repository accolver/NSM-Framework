# NSM Framework Makefile
# Nostr State Machine Framework - Development Commands

.PHONY: help install build dev test clean deploy lint format type-check status services tasks

# Default target
help:
	@echo "🏗️  NSM Framework - Available Commands"
	@echo "======================================"
	@echo ""
	@echo "📦 Setup & Dependencies:"
	@echo "  make install     Install all dependencies"
	@echo "  make clean       Clean build artifacts"
	@echo ""
	@echo "🔨 Build & Development:"
	@echo "  make build       Build all packages"
	@echo "  make dev         Start development mode"
	@echo "  make deploy      Deploy to production"
	@echo ""
	@echo "🧪 Testing & Quality:"
	@echo "  make test        Run comprehensive tests"
	@echo "  make lint        Run linter"
	@echo "  make format      Format code"
	@echo "  make type-check  Run TypeScript checks"
	@echo ""
	@echo "📊 Monitoring:"
	@echo "  make status      Show project status"
	@echo "  make services    Show development service status"
	@echo "  make tasks       Show TaskMaster tasks"

# Install all dependencies
install:
	@echo "📦 Installing NSM Framework dependencies..."
	@bun install --frozen-lockfile
	@echo "✅ Dependencies installed successfully"

# Build all packages
build:
	@echo "🔨 Building NSM Framework..."
	@bun run build
	@echo "✅ Build completed successfully"

# Development mode with enhanced URL logging
dev:
	@echo "🚀 Starting NSM Framework development mode..."
	@echo ""
	@./scripts/dev-enhanced.sh

# Run comprehensive tests
test:
	@echo "🧪 Running NSM Framework tests..."
	@./run-all-tests.sh
	@echo ""
	@echo "📊 Running package-specific tests..."
	@cd packages/nsm-client && bun test
	@cd packages/nsm-client-sdk && bun test
	@echo "✅ All tests completed"

# Clean build artifacts
clean:
	@echo "🧹 Cleaning NSM Framework..."
	@bun run clean
	@rm -rf packages/*/dist/
	@rm -rf packages/*/tsconfig.tsbuildinfo
	@rm -rf node_modules/.cache
	@echo "✅ Clean completed"

# Deploy to production
deploy: build test
	@echo "🚀 Deploying NSM Framework..."
	@echo "📋 Pre-deployment checks:"
	@echo "  ✅ Build successful"
	@echo "  ✅ Tests passing"
	@echo ""
	@echo "🌐 Deployment targets:"
	@echo "  📦 npm packages: nsm-core, nsm-client, nsm-client-sdk"
	@echo "  🏗️ Infrastructure: Blossom servers, NSM relays"
	@echo ""
	@echo "⚠️  Manual deployment steps required:"
	@echo "  1. Publish packages: bun run publish"
	@echo "  2. Deploy relay infrastructure"
	@echo "  3. Update documentation"
	@echo ""
	@echo "💡 Use TaskMaster for deployment coordination:"
	@echo "   task-master next"

# Linting
lint:
	@echo "🔍 Running linter..."
	@bun run lint
	@echo "✅ Linting completed"

# Code formatting
format:
	@echo "✨ Formatting code..."
	@bun run format
	@echo "✅ Formatting completed"

# TypeScript type checking
type-check:
	@echo "🔍 Running TypeScript checks..."
	@bun run type-check
	@echo "✅ Type checking completed"

# Show project status
status:
	@echo "📊 NSM Framework Status"
	@echo "======================"
	@echo ""
	@echo "📦 Packages:"
	@echo "  • nsm-core: Core protocol implementation"
	@echo "  • nsm-client: Client SDK with NDK integration"
	@echo "  • nsm-client-sdk: Blossom storage integration"
	@echo ""
	@echo "🧪 Test Status:"
	@./run-all-tests.sh | tail -n 10
	@echo ""
	@echo "🏗️ Build Status:"
	@if [ -d "packages/nsm-core/dist" ]; then echo "  ✅ nsm-core built"; else echo "  ❌ nsm-core needs build"; fi
	@if [ -d "packages/nsm-client/dist" ]; then echo "  ✅ nsm-client built"; else echo "  ❌ nsm-client needs build"; fi
	@if [ -d "packages/nsm-client-sdk/dist" ]; then echo "  ✅ nsm-client-sdk built"; else echo "  ❌ nsm-client-sdk needs build"; fi

# Show development service status
services:
	@./scripts/service-status.sh

# Show TaskMaster tasks
tasks:
	@echo "📋 TaskMaster Status"
	@echo "==================="
	@task-master list || echo "⚠️  TaskMaster not available - run 'bun install -g task-master-ai'"

# Development helpers
.PHONY: quick-test package-test
quick-test:
	@echo "⚡ Quick test (core only)..."
	@cd packages/nsm-core && bun test

package-test:
	@echo "📦 Testing all packages..."
	@cd packages/nsm-core && echo "Testing nsm-core..." && bun test
	@cd packages/nsm-client && echo "Testing nsm-client..." && bun test
	@cd packages/nsm-client-sdk && echo "Testing nsm-client-sdk..." && bun test

# Docker support (future)
.PHONY: docker-build docker-run
docker-build:
	@echo "🐳 Docker support coming soon..."
	@echo "  Will include: NSM relay, Blossom server, dev environment"

docker-run:
	@echo "🐳 Docker compose coming soon..."
	@echo "  Will start: Complete NSM development stack"