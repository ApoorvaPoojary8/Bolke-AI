import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
  ],
  server: {
    host: '127.0.0.1',   // bind IPv4 only — avoids ::1/localhost mismatch on Windows
    port: 5173,
    strictPort: false,
    hmr: {
      protocol: 'ws',
      host: '127.0.0.1', // force IPv4 for HMR WebSocket
    },
    // Proxy backend API calls — avoids CORS and keeps WS on port 5173 only
    proxy: {
      '/v1': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        secure: false,
      },
      '/nvidia-api': {
        target: 'https://integrate.api.nvidia.com/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/nvidia-api/, ''),
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
