import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

const API_PROXY_TARGET = process.env['VITE_PROXY_TARGET'] ?? 'http://127.0.0.1:3500';
const WEB_PORT = Number(process.env['WEB_PORT'] ?? 8080);
const WEB_HOST = process.env['VITE_HOST'] ?? '127.0.0.1';
const ALLOW_LAN = WEB_HOST === '0.0.0.0';
const LOCAL_ALLOWED_HOSTS = ['127.0.0.1', 'localhost'];
const WORKSPACE_ROOT = resolve(__dirname);

export default defineConfig({
  plugins: [react()],
  server: {
    host: WEB_HOST,
    port: WEB_PORT,
    strictPort: true,
    allowedHosts: ALLOW_LAN ? true : LOCAL_ALLOWED_HOSTS,
    cors: false,
    fs: {
      allow: [WORKSPACE_ROOT],
    },
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
    host: WEB_HOST,
    port: WEB_PORT,
    strictPort: true,
    allowedHosts: ALLOW_LAN ? true : LOCAL_ALLOWED_HOSTS,
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
});
