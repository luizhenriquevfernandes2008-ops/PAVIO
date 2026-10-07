import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { port: 5178, open: true },
  build: { chunkSizeWarningLimit: 2000 },
});
