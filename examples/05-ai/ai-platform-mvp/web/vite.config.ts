import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 8080,
    strictPort: true,
    allowedHosts: ['play.dangaogm.com'],
    proxy: {
      '/api': {
        target: 'http://localhost:3500',
        changeOrigin: true,
      },
      '/mcp': {
        target: 'http://localhost:3500',
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 8080,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3500',
        changeOrigin: true,
      },
      '/mcp': {
        target: 'http://localhost:3500',
        changeOrigin: true,
      },
    },
    allowedHosts: ['play.dangaogm.com'],
  },
});
