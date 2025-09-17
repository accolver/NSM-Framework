import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [
    react({
      include: /\.(jsx|js|tsx|ts)$/,
      babel: {
        parserOpts: {
          plugins: ['jsx']
        }
      }
    }),
    {
      name: 'nsm-url-logger',
      configureServer(server) {
        server.middlewares.use('/__nsm_ready', (req, res) => {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            app: 'POC Whiteboard',
            url: `http://localhost:${server.config.server.port}`,
            status: 'ready'
          }));
        });
      },
      buildStart() {
        console.log('🎨 POC Whiteboard starting...');
      },
      buildEnd() {
        console.log(`✅ POC Whiteboard ready: http://localhost:5173`);
      }
    }
  ],
  define: {
    global: 'globalThis',
  },
  logLevel: process.env.NODE_ENV === 'development' ? 'warn' : 'error',
  resolve: {
    alias: {
      events: 'events',
      // For development, resolve workspace packages to source
      '@nsm/client': path.resolve(__dirname, '../../packages/nsm-client/src'),
      '@nsm/client-sdk': path.resolve(__dirname, '../../packages/nsm-client-sdk/src'),
      '@nsm/core': path.resolve(__dirname, '../../packages/nsm-core/src'),
    },
  },
  server: {
    port: 5173,
    open: false,
    host: '0.0.0.0',
    hmr: {
      overlay: false
    }
  },
  build: {
    sourcemap: true,
    target: 'es2020',
    rollupOptions: {
      external: [],
      plugins: [],
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['konva', 'react-konva'],
          state: ['xstate', '@xstate/react', '@statelyai/inspect'],
          collab: ['yjs']
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    chunkSizeWarningLimit: 1000,
    assetsInlineLimit: 4096
  },
  optimizeDeps: {
    // Include packages that need optimization
    include: ['react', 'react-dom', 'konva', 'react-konva', 'xstate', '@xstate/react', 'yjs', 'events', '@statelyai/inspect'],
    exclude: [
      'gulp-sourcemaps',
      'vinyl-fs',
      'module',
      // Exclude workspace packages from optimization to avoid build issues
      '@nsm/client',
      '@nsm/client-sdk',
      '@nsm/core'
    ],
    // Force include ESM packages that might be problematic
    force: true
  },
  // ESBuild configuration
  esbuild: {
    target: 'es2020'
  },
  // Configure SSR to handle packages properly
  ssr: {
    noExternal: ['events', '@nsm/client', '@nsm/client-sdk', '@nsm/core']
  }
});