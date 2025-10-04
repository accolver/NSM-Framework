#!/bin/bash
# Validate TypeScript build order and circular dependency prevention
set -e

echo "🔍 Validating TypeScript build order..."

# Clean all builds
echo "Cleaning build artifacts..."
bun run clean > /dev/null 2>&1 || true

# Build core first
echo "Building @nsm/core..."
bun run build --filter=@nsm/core --force 2>&1 | grep -q "successful" || {
  echo "❌ @nsm/core build failed"
  exit 1
}

# Build crypto (depends on core)
echo "Building @nsm/crypto..."
bun run build --filter=@nsm/crypto --force 2>&1 | grep -q "successful" || {
  echo "❌ @nsm/crypto build failed"
  exit 1
}

# Check for TS6305 errors
echo "Checking for circular dependency errors..."
if bun tsc --noEmit --skipLibCheck 2>&1 | grep -q "TS6305"; then
  echo "❌ TS6305 circular dependency error detected"
  exit 1
fi

echo "✅ Build order validation passed"
exit 0
