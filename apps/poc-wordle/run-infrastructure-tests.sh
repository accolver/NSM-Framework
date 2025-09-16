#!/bin/bash

# Infrastructure Test Suite - Validates Vite Configuration Changes
# This script runs essential tests to verify that the infrastructure changes work correctly

set -e

echo "🧪 Running Infrastructure Test Suite..."
echo "=================================="

echo "📋 Test 1: Basic Infrastructure Validation"
bun test src/test-infrastructure.test.ts

echo ""
echo "🔧 Test 2: NSM Mock Validation"
bun test src/nsm-mock-validation.test.ts

echo ""
echo "🔗 Test 3: NSM Integration (Mocked)"
bun test src/nsm-integration-mocked.test.ts

echo ""
echo "⚛️ Test 4: React Components"
bun test src/components/App.test.tsx

echo ""
echo "🎯 Test 5: Core Logic (Wordle Machine)"
bun test src/wordle-machine.test.ts

echo ""
echo "🎮 Test 6: Game Components"
bun test src/components/WordGrid.test.tsx

echo ""
echo "⌨️ Test 7: Keyboard Component"
bun test src/components/Keyboard.test.tsx

echo ""
echo "✅ Infrastructure Test Suite Completed Successfully!"
echo "All essential tests are passing with the new Vite configuration."