# GitHub Pages Build Fix

## Problem
GitHub Actions deployment was failing with TypeScript circular dependency errors:

```
src/nostr/verifier.ts(7,34): error TS6305: Output file has not been built from source file
```

## Root Cause
- `@nsm/crypto` package depends on `@nsm/core`
- TypeScript project references were configured correctly
- But build scripts were using `tsc` instead of `tsc --build`
- Without `--build` flag, TypeScript doesn't respect project references
- This caused TypeScript to fail when `@nsm/core` hadn't been built yet

## Solution Applied

### 1. Fixed TypeScript Build Commands
Updated both `@nsm/core` and `@nsm/crypto` package.json files:

**Before:**
```json
"build": "tsc && bun build ..."
```

**After:**
```json
"build": "tsc --build && bun build ..."
```

The `--build` flag enables TypeScript's project references mode, which:
- Respects the dependency graph defined in tsconfig.json
- Builds dependencies in the correct order
- Uses cached .tsbuildinfo files for incremental builds

### 2. Fixed GitHub Actions Workflow
Modified `.github/workflows/deploy.yml` to build packages in a single Turbo command:

**Before:**
```yaml
- name: Build packages
  run: bun run build --filter=@nsm/*
```

**After:**
```yaml
- name: Build packages
  run: |
    # Build required packages (Turbo handles dependency order automatically)
    bun run build --filter='@nsm/core' --filter='@nsm/crypto' --filter='@nsm/client-sdk' --filter='@nsm/client'
```

This ensures:
- All packages build in a single Turbo run (preserves build artifacts between packages)
- Turbo automatically handles correct build order based on dependencies
- `@nsm/dev-tools` is excluded (has unrelated build issues)
- Only packages needed for deployment are built

## Files Modified

1. `/packages/nsm-crypto/package.json` - Added `--build` flag to tsc command
2. `/packages/nsm/core/package.json` - Added `--build` flag to tsc command
3. `/.github/workflows/deploy.yml` - Sequential package building

## Testing

Local build test confirms the fix works:
```bash
bun run clean
bun run build --filter='@nsm/core'
bun run build --filter='@nsm/crypto'
bun run build --filter='@nsm/client-sdk'
bun run build --filter='@nsm/client'
```

All packages build successfully with no errors.

## Next Steps

1. Commit these changes
2. Push to trigger GitHub Actions
3. Verify deployment succeeds
4. (Optional) Fix `@nsm/dev-tools` build issues separately if needed
