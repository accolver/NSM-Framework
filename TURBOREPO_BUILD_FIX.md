# Turborepo Build Order Fix

## Problem

GitHub Actions CI was failing with TypeScript errors because `@nsm/crypto` couldn't find types from `@nsm/core`:

```
src/nostr/verifier.ts(7,15): error TS2305: Module '"@nsm/core"' has no exported member 'INostrEvent'.
```

## Root Cause

The issue had two parts:

1. **Build Ordering**: Turborepo was starting both package builds almost simultaneously, even with `"dependsOn": ["^build"]` configured
2. **TypeScript Project References**: The project references in `tsconfig.json` files were not reliably resolving in CI environments, even when Turborepo correctly ordered the builds

## Solution

### Part 1: Explicit Turborepo Task Dependencies

Added explicit package-specific build dependencies in `turbo.json`:

```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "build/**", "lib/**"]
    },
    "@nsm/crypto#build": {
      "dependsOn": ["@nsm/core#build"],
      "outputs": ["dist/**"]
    },
    "@nsm/client-sdk#build": {
      "dependsOn": ["@nsm/core#build", "@nsm/crypto#build"],
      "outputs": ["dist/**"]
    },
    "@nsm/client#build": {
      "dependsOn": ["@nsm/core#build", "@nsm/crypto#build"],
      "outputs": ["dist/**"]
    }
  }
}
```

This ensures:

1. **@nsm/core** always builds first (no dependencies)
2. **@nsm/crypto** waits for @nsm/core to complete
3. **@nsm/client-sdk** waits for both @nsm/core and @nsm/crypto
4. **@nsm/client** waits for both @nsm/core and @nsm/crypto

### Part 2: Remove TypeScript Project References

Removed TypeScript project references from package tsconfig.json files:

**Before** (`packages/nsm-crypto/tsconfig.json`):
```json
{
  "references": [
    { "path": "../nsm-core" }
  ]
}
```

**After**:
```json
{
  // No references - TypeScript will use workspace dependencies from node_modules
}
```

**Why This Works**:
- Bun's workspace resolution creates symlinks in `node_modules/@nsm/*` pointing to package directories
- TypeScript finds type declarations through normal module resolution via these symlinks
- This is more reliable than project references, which can have timing issues in CI environments
- Turborepo's explicit task ordering ensures types are built before dependent packages need them

## Testing

### Local Test

```bash
# Clean build from scratch
bun run clean

# Test building crypto (should automatically build core first)
bun run build --filter='@nsm/crypto' --force

# Verify output shows core building before crypto
```

### CI Test

The GitHub Actions workflow will now build packages in the correct order:

```bash
bun run build --filter='@nsm/core' --filter='@nsm/crypto' --filter='@nsm/client-sdk' --filter='@nsm/client'
```

## Package Dependency Graph

```
@nsm/core (foundation)
    ├── @nsm/crypto
    │   ├── @nsm/client-sdk
    │   └── @nsm/client
    ├── @nsm/client-sdk
    └── @nsm/client
```

## Why This Works

1. **Explicit Dependencies**: Package-specific `dependsOn` is more explicit than the generic `^build`
2. **Turborepo Task Graph**: Turborepo constructs a task dependency graph and executes tasks in topological order
3. **TypeScript Project References**: Once Turborepo ensures correct ordering, TypeScript's `tsc --build` can successfully find the built declaration files

## Alternative Solutions Considered

1. **`--concurrency=1`**: Would work but forces all builds to be serial (slower)
2. **Separate TypeScript and bundle steps**: Would require restructuring build scripts
3. **Change TypeScript moduleResolution**: Wouldn't solve the timing issue

## Related Files

- `turbo.json` - Turborepo task configuration with explicit dependencies
- `packages/nsm-crypto/tsconfig.json` - Removed project references
- `packages/nsm-client-sdk/tsconfig.json` - Removed project references
- `.github/workflows/deploy.yml` - GitHub Actions workflow
