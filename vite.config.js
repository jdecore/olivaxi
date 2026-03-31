import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    allowedHosts: ['45.90.237.135']
  },
  preview: {
    host: '0.0.0.0',
    allowedHosts: ['45.90.237.135']
  }
});