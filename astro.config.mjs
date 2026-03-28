import { defineConfig } from 'astro/config';
import solid from '@astrojs/solid-js';

export default defineConfig({
  integrations: [
    solid({ include: ['**/ChatConsejero.jsx'] })
  ],
  build: {
    inlineStylesheets: 'always',
    assetsInlineLimit: 2048,
    emptyOutDir: true,
    rollupOptions: {
      external: ['leaflet']
    }
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
  preview: {
    allowedHosts: ['olivaxi.duckdns.org']
  },
  devToolbar: {
    enabled: false
  },
  prefetch: false
});