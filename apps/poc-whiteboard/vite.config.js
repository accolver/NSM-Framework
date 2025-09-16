import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      events: 'events',
      module: 'module',
    },
  },
  server: {
    port: 5173,
    open: false,
    host: '0.0.0.0',
  },
  build: {
    sourcemap: true,
    target: 'es2020',
    minify: 'esbuild',
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['konva', 'react-konva'],
          nsm: ['@nsm/client', '@nsm/client-sdk', '@nsm/core'],
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
    include: ['react', 'react-dom', 'konva', 'react-konva', 'xstate', '@xstate/react', 'yjs', 'events', 'module'],
    exclude: ['@statelyai/inspect']
  },
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' },
    drop: ['console', 'debugger'],
    legalComments: 'none'
  }
});