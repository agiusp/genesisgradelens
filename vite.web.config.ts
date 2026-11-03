import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';
import { readFileSync } from 'node:fs';

// Version shown in the app and on the install page, e.g. "0.2.0 (2026-11-03)".
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const VERSION = `${pkg.version} (${new Date().toISOString().slice(0, 10)})`;

// The bookmark script: one classic (non-module) file, site/ggl.js, loaded into a Genesis tab.
// Run after vite.site.config.ts, which empties site/.
export default defineConfig({
  plugins: [preact()],
  define: { 'process.env.NODE_ENV': JSON.stringify('production'), __GGL_VERSION__: JSON.stringify(VERSION) },
  build: {
    outDir: 'site',
    emptyOutDir: false,
    assetsInlineLimit: Number.MAX_SAFE_INTEGER, // everything must live inside the bookmark
    lib: {
      entry: 'src/platform/web/main.tsx',
      formats: ['iife'],
      name: 'GenesisGradeLens',
      fileName: () => 'ggl.js',
    },
  },
});
