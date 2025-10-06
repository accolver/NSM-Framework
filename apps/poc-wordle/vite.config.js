import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages base path - POC Wordle is served from /wordle subdirectory
  base: process.env.VITE_BASE_PATH || '/NSM-Framework/wordle/',
  plugins: [
    react(),
    {
      name: 'nsm-url-logger',
      configureServer(server) {
        server.middlewares.use('/__nsm_ready', (req, res) => {
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              app: 'POC Wordle',
              url: `http://localhost:${server.config.server.port}`,
              status: 'ready',
            })
          );
        });
      },
      buildStart() {
        console.log('🎮 POC Wordle starting...');
      },
      buildEnd() {
        console.log(`✅ POC Wordle ready: http://localhost:5174`);
      },
    },
  ],
  define: {
    global: 'globalThis',
  },
  server: {
    port: 5174,
    open: false,
    host: '0.0.0.0',
    hmr: {
      overlay: false,
    },
    // Custom startup message for URL logging
    setupExitSignals: true,
  },
  logLevel: process.env.NODE_ENV === 'development' ? 'warn' : 'error',
  build: {
    sourcemap: true,
    target: 'es2020',
    minify: false, // Disable minification to avoid ESBuild issues
    cssMinify: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          nsm: ['@nsm/core'],
          state: ['xstate', '@xstate/react'],
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    chunkSizeWarningLimit: 1000,
    assetsInlineLimit: 4096,
  },
  optimizeDeps: {
    // Include packages that need optimization
    include: ['react', 'react-dom', 'xstate', '@xstate/react', 'events'],
    // Don't prebundle workspace pkgs; resolve from built dist via exports
    exclude: ['@nsm/client', '@nsm/client-sdk', '@nsm/core', '@nsm/crypto', '@nsm/dev-tools'],
    force: true,
  },
  resolve: {
    preserveSymlinks: true,
    alias: {
      '@': '/src',
      events: 'events',
    },
  },
  // Disable ESBuild to avoid service conflicts
  esbuild: false,
  // Configure SSR to handle packages properly
  ssr: {
    noExternal: [
      'events',
      '@nsm/client-sdk',
      '@nsm/client',
      '@nsm/core',
      '@nsm/crypto',
      '@nsm/dev-tools',
    ],
  },
});
