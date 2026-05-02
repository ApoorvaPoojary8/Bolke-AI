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
      port: 5173,
      clientPort: 5173,
    },
    // Proxy backend API calls — avoids CORS and keeps WS on port 5173 only
    proxy: {
      '/v1': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
