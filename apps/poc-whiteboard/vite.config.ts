import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  server: {
    port: 5173,
    open: true,
    host: '0.0.0.0', // Allow connections from any IP (helpful for WSL2)
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@nsm/core': path.resolve(__dirname, '../../packages/nsm-core/src'),
      '@nsm/client': path.resolve(__dirname, '../../packages/nsm-client/src'),
      '@nsm/client-sdk': path.resolve(__dirname, '../../packages/nsm-client-sdk/src'),
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'xstate', '@xstate/react', 'konva', 'react-konva', 'yjs'],
  },
});