import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';

// The bookmark script: one classic (non-module) file, site/ggl.js, loaded into a Genesis tab.
// Run after vite.site.config.ts, which empties site/.
export default defineConfig({
  plugins: [preact()],
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    outDir: 'site',
    emptyOutDir: false,
    lib: {
      entry: 'src/platform/web/main.tsx',
      formats: ['iife'],
      name: 'GenesisGradeLens',
      fileName: () => 'ggl.js',
    },
  },
});
