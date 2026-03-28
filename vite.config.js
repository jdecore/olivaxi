import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '0.0.0.0'
  },
  preview: {
    host: '0.0.0.0',
    allowedHosts: ['olivaxi.duckdns.org', 'olivaxi.duckdns.org.', 'localhost']
  }
});