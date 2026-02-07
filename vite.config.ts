import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  base: '/Aqua-Park/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 4096,
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
          howler: ['howler'],
        },
      },
    },
  },
  server: {
    port: 3000,
    host: true,
  },
});
