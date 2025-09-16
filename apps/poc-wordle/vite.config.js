import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  server: {
    port: 5174,
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
          nsm: ['@nsm/client', '@nsm/core'],
          state: ['xstate', '@xstate/react']
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
    include: ['react', 'react-dom', 'xstate', '@xstate/react', 'events'],
    force: true
  },
  resolve: {
    alias: {
      '@': '/src',
      events: 'events',
    },
  },
  esbuild: {
    drop: ['console', 'debugger'],
    legalComments: 'none'
  }
});