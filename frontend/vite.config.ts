import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api/predict': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/api/files': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
      },
      '/api/dashboard': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
      },
      '/api/analyses': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
      },
      '/api/export': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
      },
      '/api/chat': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
      },
      '/api/scheduler': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
      },
      '/api/retrain': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
      },
      '/api/health': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/auth': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
      },
      '/admin': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://127.0.0.1:8001',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
