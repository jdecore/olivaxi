// @ts-check
import { defineConfig } from 'astro/config';
import solid from '@astrojs/solid-js';

export default defineConfig({
  integrations: [
    solid({ include: ['**/ChatConsejero.jsx'] })
  ],
  prefetch: {
    prefetchAll: false,
    defaultStrategy: 'hover'
  },
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
      target: 'es2020',
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes('node_modules')) return 'vendor';
          }
        }
      }
    },
    optimizeDeps: {
      exclude: ['solid-js']
    }
  },
  devToolbar: {
    enabled: false
  },
  server: {
    port: 3000
  },
  output: 'static'
});