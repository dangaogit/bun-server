import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const API_PROXY_TARGET = process.env['VITE_PROXY_TARGET'] ?? 'http://127.0.0.1:3500';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 8080,
    strictPort: true,
    allowedHosts: ['play.dangaogm.com'],
    proxy: {
      '/api': {
        target: API_PROXY_TARGET,
        changeOrigin: true,
        ws: true,
        timeout: 300000,
        proxyTimeout: 300000,
      },
      '/mcp': {
        target: API_PROXY_TARGET,
        changeOrigin: true,
        ws: true,
        timeout: 300000,
        proxyTimeout: 300000,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 8080,
    strictPort: true,
    proxy: {
      '/api': {
        target: API_PROXY_TARGET,
        changeOrigin: true,
        ws: true,
        timeout: 300000,
        proxyTimeout: 300000,
      },
      '/mcp': {
        target: API_PROXY_TARGET,
        changeOrigin: true,
        ws: true,
        timeout: 300000,
        proxyTimeout: 300000,
      },
    },
    allowedHosts: ['play.dangaogm.com'],
  },
});
