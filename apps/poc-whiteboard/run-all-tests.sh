#!/bin/bash

# Test runner script for poc-whiteboard
echo "🧪 Running all tests for NSM POC Whiteboard..."

# Run specific test files one by one to better isolate issues
echo "📋 Running service tests..."
bun test src/services/__tests__/ || echo "⚠️ Some service tests failed"

echo "📦 Running component tests..."
bun test src/components/__tests__/ || echo "⚠️ Some component tests failed"

echo "🔧 Running integration tests..."
bun test src/test/ || echo "⚠️ Some integration tests failed"

echo "✅ Test run complete!"