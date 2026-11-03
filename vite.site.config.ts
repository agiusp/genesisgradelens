import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';

// The GenesisGradeLens website (GitHub Pages): install page + account page.
// Relative base so it works at https://<user>.github.io/<repo>/ without configuration.
export default defineConfig({
  root: 'web',
  base: './',
  publicDir: '../public',
  plugins: [preact()],
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
