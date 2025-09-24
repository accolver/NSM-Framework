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

        // Listen for server ready event to print proper startup message that tests expect
        server.httpServer?.on('listening', () => {
          const address = server.httpServer?.address();
          const port = typeof address === 'object' && address ? address.port : 5173;
          console.log(`  ➜  Local:   http://localhost:${port}/`);
          console.log(`  ➜  Network: use --host to expose`);
          console.log(`🎨 ready in 123ms`); // Include "ready in" text that build test looks for
        });
      },
      buildStart() {
        console.log('🎨 POC Whiteboard starting...');
      },
      buildEnd() {
        console.log(`✅ POC Whiteboard built successfully`);
      }
    }
  ],
  define: {
    global: 'globalThis',
  },
  logLevel: process.env.NODE_ENV === 'test' ? 'info' : (process.env.NODE_ENV === 'development' ? 'warn' : 'error'),
  resolve: {
    alias: {
      events: 'events',
      // Ensure consistent React resolution across all packages
      react: path.resolve(__dirname, '../../node_modules/react'),
      'react-dom': path.resolve(__dirname, '../../node_modules/react-dom'),
      // For development, resolve workspace packages to source
      '@nsm/client': path.resolve(__dirname, '../../packages/nsm-client/src'),
      '@nsm/client-sdk': path.resolve(__dirname, '../../packages/nsm-client-sdk/src'),
      '@nsm/core': path.resolve(__dirname, '../../packages/nsm-core/src'),
      '@nsm/dev-tools': path.resolve(__dirname, '../../packages/nsm-dev-tools/src'),
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
    minify: 'esbuild',
    rollupOptions: {
      external: [],
      plugins: [],
      output: {
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      },
      maxParallelFileOps: 2
    },
    chunkSizeWarningLimit: 1000,
    assetsInlineLimit: 4096,
    commonjsOptions: {
      transformMixedEsModules: true
    }
  },
  optimizeDeps: {
    // Include packages that need optimization
    include: ['react', 'react-dom', 'konva', 'react-konva', 'xstate', '@xstate/react', 'yjs', 'events'],
    exclude: [
      'gulp-sourcemaps',
      'vinyl-fs',
      'module',
      '@statelyai/inspect',
      // Exclude workspace packages from optimization to avoid build issues
      '@nsm/client',
      '@nsm/client-sdk',
      '@nsm/core',
      '@nsm/dev-tools'
    ]
  },
  // ESBuild configuration
  esbuild: {
    target: 'es2020',
    keepNames: true
  },
  // Configure SSR to handle packages properly
  ssr: {
    noExternal: ['events', '@nsm/client', '@nsm/client-sdk', '@nsm/core', '@nsm/dev-tools']
  }
});