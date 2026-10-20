import { defineConfig } from 'vite';

// relative base so the built site works from any static host or sub-path
export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 1600 },
});
