# TypeScript Circular Dependency Fix

## Problem

GitHub Pages deployment was failing with TypeScript TS6305 errors:

```
src/nostr/verifier.ts(7,34): error TS6305: Output file '/home/runner/work/NSM-Framework/NSM-Framework/packages/nsm-core/dist/index.d.ts' has not been built from source file '/home/runner/work/NSM-Framework/NSM-Framework/packages/nsm-core/src/index.ts'.
```

## Root Cause

The root `tsconfig.json` had path mappings that pointed to source directories:

```json
"paths": {
  "@nsm/core": ["./packages/nsm-core/src"],
  "@nsm/crypto": ["./packages/nsm-crypto/src"],
  ...
}
```

When using TypeScript composite projects with project references:
1. `@nsm/crypto` imports types from `@nsm/core`
2. The path mapping pointed TypeScript to `@nsm/core/src`
3. TypeScript tried to compile `@nsm/core/src` while building `@nsm/crypto`
4. This created a circular reference in the TypeScript compiler
5. TypeScript expected built declaration files but found source files

## Solution

Removed the `paths` and `baseUrl` configuration from root `tsconfig.json`. TypeScript now uses:
- Workspace protocol (`workspace:*`) for package resolution
- Project references for build order
- Node module resolution for finding built declaration files

## Changes Made

### tsconfig.json
- Removed `baseUrl: "."`
- Removed `paths` configuration mapping package names to source directories

### Build Process
No changes needed. The existing build process works correctly:
1. `@nsm/core` builds first (has no dependencies)
2. `@nsm/crypto` builds after (depends on `@nsm/core`)
3. TypeScript uses built `.d.ts` files from `dist/` directories

## Validation

Run the validation script to ensure the fix works:

```bash
./scripts/validate-build-order.sh
```

This script:
1. Cleans all build artifacts
2. Builds packages in correct order
3. Checks for TS6305 errors
4. Validates the fix

## Why This Works

**Before:**
- Path mappings pointed to source directories
- TypeScript tried to compile source files during dependent builds
- Created circular compilation dependencies

**After:**
- No path mappings - uses workspace resolution
- TypeScript uses project references
- Finds built declaration files in `dist/` directories
- No circular dependencies

## Testing

### Local Testing
```bash
# Clean build
bun run clean

# Build packages
bun run build --filter='@nsm/*'

# Verify no TS6305 errors
bun tsc --noEmit --skipLibCheck 2>&1 | grep "TS6305"
# Should return no results
```

### CI Testing
The GitHub Actions workflow runs:
```bash
bun run build --filter=@nsm/*
```

This now succeeds because:
1. Packages build in correct order (via project references)
2. No path mappings causing circular compilation
3. TypeScript finds built declaration files correctly

## Related Files

- `/tsconfig.json` - Root TypeScript configuration
- `/packages/nsm-core/tsconfig.json` - Core package config
- `/packages/nsm-crypto/tsconfig.json` - Crypto package config (references core)
- `/turbo.json` - Turborepo build configuration
- `/.github/workflows/deploy.yml` - GitHub Actions deployment workflow

## Best Practices

When using TypeScript composite projects in a monorepo:

1. **Don't use path mappings** that point to source directories
2. **Use project references** to establish build order
3. **Let TypeScript resolve** built declaration files automatically
4. **Use workspace protocol** in package.json for local dependencies
5. **Test clean builds** to catch circular dependency issues early

## Verification

✅ Local build succeeds
✅ Clean build works
✅ No TS6305 errors
✅ Project references work correctly
✅ Apps can import packages
✅ CI deployment should succeed
