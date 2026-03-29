import { defineConfig } from 'astro/config';
import solid from '@astrojs/solid-js';

export default defineConfig({
  srcDir: './src',
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
    },
    define: {
      'process.env': {}
    }
  },
  devToolbar: {
    enabled: false
  },
  prefetch: false
});