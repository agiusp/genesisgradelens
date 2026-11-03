import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';

// Builds the Chrome extension into dist/. Load it via chrome://extensions → "Load unpacked".
export default defineConfig({
  plugins: [preact()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        app: 'app.html',
        background: 'src/platform/extension/background.ts',
      },
      output: {
        // The manifest refers to background.js by a fixed name.
        entryFileNames: (chunk) =>
          chunk.name === 'background' ? 'background.js' : 'assets/[name]-[hash].js',
      },
    },
  },
  test: {
    environment: 'jsdom',
  },
});
