// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import solid from '@astrojs/solid-js';

export default defineConfig({
  integrations: [
    react({ include: [] }),
    solid({ include: ['**/ChatConsejero.jsx'] })
  ],
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
    cacheControl: 'immutable'
  },
  build: {
    inlineStylesheets: 'auto',
    assetsInlineLimit: 4096
  },
  compressHTML: false,
  vite: {
    build: {
      cssMinify: true,
      minify: 'terser',
      rollupOptions: {
        output: {
          manualChunks: undefined
        }
      }
    }
  },
  devToolbar: {
    enabled: false
  }
});