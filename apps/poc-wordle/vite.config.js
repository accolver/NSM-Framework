import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    open: false,
    host: '0.0.0.0',
  },
  build: {
    sourcemap: true,
    target: 'es2020',
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});