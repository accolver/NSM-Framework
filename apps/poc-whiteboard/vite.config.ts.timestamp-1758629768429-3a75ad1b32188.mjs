// vite.config.ts
import { defineConfig } from "file:///Users/alancolver/dev/nostr/nsm/apps/poc-whiteboard/node_modules/vite/dist/node/index.js";
import react from "file:///Users/alancolver/dev/nostr/nsm/node_modules/@vitejs/plugin-react/dist/index.js";
import path from "path";
var __vite_injected_original_dirname = "/Users/alancolver/dev/nostr/nsm/apps/poc-whiteboard";
var vite_config_default = defineConfig({
  plugins: [
    react({
      include: /\.(jsx|js|tsx|ts)$/,
      babel: {
        parserOpts: {
          plugins: ["jsx"]
        }
      }
    }),
    {
      name: "nsm-url-logger",
      configureServer(server) {
        server.middlewares.use("/__nsm_ready", (req, res) => {
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({
            app: "POC Whiteboard",
            url: `http://localhost:${server.config.server.port}`,
            status: "ready"
          }));
        });
      },
      buildStart() {
        console.log("\u{1F3A8} POC Whiteboard starting...");
      },
      buildEnd() {
        console.log(`\u2705 POC Whiteboard ready: http://localhost:5173`);
      }
    }
  ],
  define: {
    global: "globalThis"
  },
  logLevel: process.env.NODE_ENV === "development" ? "warn" : "error",
  resolve: {
    alias: {
      events: "events",
      // Ensure consistent React resolution across all packages
      react: path.resolve(__vite_injected_original_dirname, "../../node_modules/react"),
      "react-dom": path.resolve(__vite_injected_original_dirname, "../../node_modules/react-dom"),
      // For development, resolve workspace packages to source
      "@nsm/client": path.resolve(__vite_injected_original_dirname, "../../packages/nsm-client/src"),
      "@nsm/client-sdk": path.resolve(__vite_injected_original_dirname, "../../packages/nsm-client-sdk/src"),
      "@nsm/core": path.resolve(__vite_injected_original_dirname, "../../packages/nsm-core/src"),
      "@nsm/dev-tools": path.resolve(__vite_injected_original_dirname, "../../packages/nsm-dev-tools/src")
    }
  },
  server: {
    port: 5173,
    open: false,
    host: "0.0.0.0",
    hmr: {
      overlay: false
    }
  },
  build: {
    sourcemap: true,
    target: "es2020",
    minify: "esbuild",
    rollupOptions: {
      external: [],
      plugins: [],
      output: {
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]"
      },
      maxParallelFileOps: 2
    },
    chunkSizeWarningLimit: 1e3,
    assetsInlineLimit: 4096,
    commonjsOptions: {
      transformMixedEsModules: true
    }
  },
  optimizeDeps: {
    // Include packages that need optimization
    include: ["react", "react-dom", "konva", "react-konva", "xstate", "@xstate/react", "yjs", "events"],
    exclude: [
      "gulp-sourcemaps",
      "vinyl-fs",
      "module",
      "@statelyai/inspect",
      // Exclude workspace packages from optimization to avoid build issues
      "@nsm/client",
      "@nsm/client-sdk",
      "@nsm/core",
      "@nsm/dev-tools"
    ]
  },
  // ESBuild configuration
  esbuild: {
    target: "es2020",
    keepNames: true
  },
  // Configure SSR to handle packages properly
  ssr: {
    noExternal: ["events", "@nsm/client", "@nsm/client-sdk", "@nsm/core", "@nsm/dev-tools"]
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvYWxhbmNvbHZlci9kZXYvbm9zdHIvbnNtL2FwcHMvcG9jLXdoaXRlYm9hcmRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy9hbGFuY29sdmVyL2Rldi9ub3N0ci9uc20vYXBwcy9wb2Mtd2hpdGVib2FyZC92aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vVXNlcnMvYWxhbmNvbHZlci9kZXYvbm9zdHIvbnNtL2FwcHMvcG9jLXdoaXRlYm9hcmQvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW1xuICAgIHJlYWN0KHtcbiAgICAgIGluY2x1ZGU6IC9cXC4oanN4fGpzfHRzeHx0cykkLyxcbiAgICAgIGJhYmVsOiB7XG4gICAgICAgIHBhcnNlck9wdHM6IHtcbiAgICAgICAgICBwbHVnaW5zOiBbJ2pzeCddXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KSxcbiAgICB7XG4gICAgICBuYW1lOiAnbnNtLXVybC1sb2dnZXInLFxuICAgICAgY29uZmlndXJlU2VydmVyKHNlcnZlcikge1xuICAgICAgICBzZXJ2ZXIubWlkZGxld2FyZXMudXNlKCcvX19uc21fcmVhZHknLCAocmVxLCByZXMpID0+IHtcbiAgICAgICAgICByZXMuc2V0SGVhZGVyKCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24vanNvbicpO1xuICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgICAgYXBwOiAnUE9DIFdoaXRlYm9hcmQnLFxuICAgICAgICAgICAgdXJsOiBgaHR0cDovL2xvY2FsaG9zdDoke3NlcnZlci5jb25maWcuc2VydmVyLnBvcnR9YCxcbiAgICAgICAgICAgIHN0YXR1czogJ3JlYWR5J1xuICAgICAgICAgIH0pKTtcbiAgICAgICAgfSk7XG4gICAgICB9LFxuICAgICAgYnVpbGRTdGFydCgpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ1x1RDgzQ1x1REZBOCBQT0MgV2hpdGVib2FyZCBzdGFydGluZy4uLicpO1xuICAgICAgfSxcbiAgICAgIGJ1aWxkRW5kKCkge1xuICAgICAgICBjb25zb2xlLmxvZyhgXHUyNzA1IFBPQyBXaGl0ZWJvYXJkIHJlYWR5OiBodHRwOi8vbG9jYWxob3N0OjUxNzNgKTtcbiAgICAgIH1cbiAgICB9XG4gIF0sXG4gIGRlZmluZToge1xuICAgIGdsb2JhbDogJ2dsb2JhbFRoaXMnLFxuICB9LFxuICBsb2dMZXZlbDogcHJvY2Vzcy5lbnYuTk9ERV9FTlYgPT09ICdkZXZlbG9wbWVudCcgPyAnd2FybicgOiAnZXJyb3InLFxuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IHtcbiAgICAgIGV2ZW50czogJ2V2ZW50cycsXG4gICAgICAvLyBFbnN1cmUgY29uc2lzdGVudCBSZWFjdCByZXNvbHV0aW9uIGFjcm9zcyBhbGwgcGFja2FnZXNcbiAgICAgIHJlYWN0OiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vbm9kZV9tb2R1bGVzL3JlYWN0JyksXG4gICAgICAncmVhY3QtZG9tJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL25vZGVfbW9kdWxlcy9yZWFjdC1kb20nKSxcbiAgICAgIC8vIEZvciBkZXZlbG9wbWVudCwgcmVzb2x2ZSB3b3Jrc3BhY2UgcGFja2FnZXMgdG8gc291cmNlXG4gICAgICAnQG5zbS9jbGllbnQnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vcGFja2FnZXMvbnNtLWNsaWVudC9zcmMnKSxcbiAgICAgICdAbnNtL2NsaWVudC1zZGsnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vcGFja2FnZXMvbnNtLWNsaWVudC1zZGsvc3JjJyksXG4gICAgICAnQG5zbS9jb3JlJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3BhY2thZ2VzL25zbS1jb3JlL3NyYycpLFxuICAgICAgJ0Buc20vZGV2LXRvb2xzJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3BhY2thZ2VzL25zbS1kZXYtdG9vbHMvc3JjJyksXG4gICAgfSxcbiAgfSxcbiAgc2VydmVyOiB7XG4gICAgcG9ydDogNTE3MyxcbiAgICBvcGVuOiBmYWxzZSxcbiAgICBob3N0OiAnMC4wLjAuMCcsXG4gICAgaG1yOiB7XG4gICAgICBvdmVybGF5OiBmYWxzZVxuICAgIH1cbiAgfSxcbiAgYnVpbGQ6IHtcbiAgICBzb3VyY2VtYXA6IHRydWUsXG4gICAgdGFyZ2V0OiAnZXMyMDIwJyxcbiAgICBtaW5pZnk6ICdlc2J1aWxkJyxcbiAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICBleHRlcm5hbDogW10sXG4gICAgICBwbHVnaW5zOiBbXSxcbiAgICAgIG91dHB1dDoge1xuICAgICAgICBjaHVua0ZpbGVOYW1lczogJ2Fzc2V0cy9bbmFtZV0tW2hhc2hdLmpzJyxcbiAgICAgICAgZW50cnlGaWxlTmFtZXM6ICdhc3NldHMvW25hbWVdLVtoYXNoXS5qcycsXG4gICAgICAgIGFzc2V0RmlsZU5hbWVzOiAnYXNzZXRzL1tuYW1lXS1baGFzaF0uW2V4dF0nXG4gICAgICB9LFxuICAgICAgbWF4UGFyYWxsZWxGaWxlT3BzOiAyXG4gICAgfSxcbiAgICBjaHVua1NpemVXYXJuaW5nTGltaXQ6IDEwMDAsXG4gICAgYXNzZXRzSW5saW5lTGltaXQ6IDQwOTYsXG4gICAgY29tbW9uanNPcHRpb25zOiB7XG4gICAgICB0cmFuc2Zvcm1NaXhlZEVzTW9kdWxlczogdHJ1ZVxuICAgIH1cbiAgfSxcbiAgb3B0aW1pemVEZXBzOiB7XG4gICAgLy8gSW5jbHVkZSBwYWNrYWdlcyB0aGF0IG5lZWQgb3B0aW1pemF0aW9uXG4gICAgaW5jbHVkZTogWydyZWFjdCcsICdyZWFjdC1kb20nLCAna29udmEnLCAncmVhY3Qta29udmEnLCAneHN0YXRlJywgJ0B4c3RhdGUvcmVhY3QnLCAneWpzJywgJ2V2ZW50cyddLFxuICAgIGV4Y2x1ZGU6IFtcbiAgICAgICdndWxwLXNvdXJjZW1hcHMnLFxuICAgICAgJ3ZpbnlsLWZzJyxcbiAgICAgICdtb2R1bGUnLFxuICAgICAgJ0BzdGF0ZWx5YWkvaW5zcGVjdCcsXG4gICAgICAvLyBFeGNsdWRlIHdvcmtzcGFjZSBwYWNrYWdlcyBmcm9tIG9wdGltaXphdGlvbiB0byBhdm9pZCBidWlsZCBpc3N1ZXNcbiAgICAgICdAbnNtL2NsaWVudCcsXG4gICAgICAnQG5zbS9jbGllbnQtc2RrJyxcbiAgICAgICdAbnNtL2NvcmUnLFxuICAgICAgJ0Buc20vZGV2LXRvb2xzJ1xuICAgIF1cbiAgfSxcbiAgLy8gRVNCdWlsZCBjb25maWd1cmF0aW9uXG4gIGVzYnVpbGQ6IHtcbiAgICB0YXJnZXQ6ICdlczIwMjAnLFxuICAgIGtlZXBOYW1lczogdHJ1ZVxuICB9LFxuICAvLyBDb25maWd1cmUgU1NSIHRvIGhhbmRsZSBwYWNrYWdlcyBwcm9wZXJseVxuICBzc3I6IHtcbiAgICBub0V4dGVybmFsOiBbJ2V2ZW50cycsICdAbnNtL2NsaWVudCcsICdAbnNtL2NsaWVudC1zZGsnLCAnQG5zbS9jb3JlJywgJ0Buc20vZGV2LXRvb2xzJ11cbiAgfVxufSk7Il0sCiAgIm1hcHBpbmdzIjogIjtBQUEyVSxTQUFTLG9CQUFvQjtBQUN4VyxPQUFPLFdBQVc7QUFDbEIsT0FBTyxVQUFVO0FBRmpCLElBQU0sbUNBQW1DO0FBSXpDLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVM7QUFBQSxJQUNQLE1BQU07QUFBQSxN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
