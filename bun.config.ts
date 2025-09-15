import { defineConfig } from "bun";

export default defineConfig({
  // Bun configuration for the NSM Framework
  test: {
    // Test configuration
    preload: ["./test/setup.ts"]
  },
  build: {
    // Build configuration
    minify: process.env.NODE_ENV === "production",
    sourcemap: "external",
    splitting: true,
    target: "es2022",
  }
});