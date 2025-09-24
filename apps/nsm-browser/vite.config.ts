import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    host: true
  },
  resolve: {
    alias: {
      '@nsm/client': path.resolve(__dirname, '../../packages/nsm-client/src/index.ts'),
      '@nsm/core': path.resolve(__dirname, '../../packages/nsm-core/src/index.ts')
    }
  },
  test: {
    environment: 'happy-dom',
    setupFiles: ['./src/test-setup.ts'],
    globals: true,
    pool: 'forks'
  },
  build: {
    target: 'es2020',
    outDir: 'dist'
  }
});