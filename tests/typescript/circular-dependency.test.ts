/**
 * Test to verify TypeScript circular dependency fix
 * This test ensures TS6305 errors don't occur
 */

import { describe, it, expect } from "bun:test";

describe("TypeScript Circular Dependency Prevention", () => {
  it("should not have path mappings in root tsconfig", async () => {
    const tsconfig = await Bun.file("tsconfig.json").json();

    // Path mappings should not exist in root config
    // This was the root cause of the TS6305 circular dependency error
    expect(tsconfig.compilerOptions?.paths).toBeUndefined();
    expect(tsconfig.compilerOptions?.baseUrl).toBeUndefined();
  });

  it("should have correct project references in crypto package", async () => {
    const tsconfig = await Bun.file("packages/nsm-crypto/tsconfig.json").json();

    // Crypto should reference core via project references
    expect(tsconfig.references).toBeDefined();
    expect(tsconfig.references).toContainEqual({ path: "../nsm-core" });
  });

  it("should have composite: true in package tsconfigs", async () => {
    const coreTsconfig = await Bun.file("packages/nsm-core/tsconfig.json").json();
    const cryptoTsconfig = await Bun.file("packages/nsm-crypto/tsconfig.json").json();

    // Composite projects are required for project references
    expect(coreTsconfig.compilerOptions?.composite).toBe(true);
    expect(cryptoTsconfig.compilerOptions?.composite).toBe(true);
  });

  it("should use type-only imports for cross-package dependencies", async () => {
    const verifierContent = await Bun.file("packages/nsm-crypto/src/nostr/verifier.ts").text();
    const typesContent = await Bun.file("packages/nsm-crypto/src/types.ts").text();

    // Verify type-only imports are used
    expect(verifierContent).toContain("import type { INostrEvent } from '@nsm/core'");
    expect(typesContent).toContain("import type { INostrEvent } from \"@nsm/core\"");
  });
});
