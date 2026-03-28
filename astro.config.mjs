// @ts-check
import { defineConfig } from 'astro/config';
import solid from '@astrojs/solid-js';

export default defineConfig({
  integrations: [
    solid({ include: ['**/ChatConsejero.jsx'] })
  ],
  build: {
    inlineStylesheets: 'always',
    assetsInlineLimit: 2048,
    emptyOutDir: true
  },
  compressHTML: true,
  vite: {
    build: {
      cssMinify: true,
      minify: 'esbuild',
      target: 'esnext'
    }
  },
  devToolbar: {
    enabled: false
  },
  prefetch: false
});