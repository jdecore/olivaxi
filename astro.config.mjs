import { defineConfig } from 'astro/config';
import solid from '@astrojs/solid-js';

export default defineConfig({
  srcDir: './src',
  integrations: [
    solid({ include: ['**/ChatConsejero.jsx'] })
  ],
  build: {
    inlineStylesheets: 'always',
    assetsInlineLimit: 4096,
    emptyOutDir: true
  },
  compressHTML: true,
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover'
  },
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
  }
});