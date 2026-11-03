import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';
import { readFileSync } from 'node:fs';

// Version shown in the app and on the install page, e.g. "0.2.0 (2026-11-03)".
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const VERSION = `${pkg.version} (${new Date().toISOString().slice(0, 10)})`;

// The GenesisGradeLens website (GitHub Pages): install page + account page.
// Relative base so it works at https://<user>.github.io/<repo>/ without configuration.
export default defineConfig({
  root: 'web',
  base: './',
  publicDir: '../public',
  plugins: [preact()],
  define: { __GGL_VERSION__: JSON.stringify(VERSION) },
  build: {
    outDir: '../site',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: 'web/index.html',
        account: 'web/account.html',
      },
    },
  },
});
