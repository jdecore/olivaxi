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
    defaultStrategy: 'viewport'
  },
  build: {
    inlineStylesheets: 'auto'
  },
  compressHTML: true,
  devToolbar: {
    enabled: false
  }
});