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
    server: {
      host: '0.0.0.0',
      allowedHosts: ['olivaxi.duckdns.org']
    },
    preview: {
      host: '0.0.0.0',
      allowedHosts: ['olivaxi.duckdns.org']
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