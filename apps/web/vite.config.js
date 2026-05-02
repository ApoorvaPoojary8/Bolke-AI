import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
  ],
  server: {
    host: '0.0.0.0',     // bind all interfaces (IPv4 + IPv6)
    port: 5173,
    strictPort: true,
    hmr: {
      protocol: 'ws',
      host: '127.0.0.1', // force IPv4 for WebSocket — avoids ::1 mismatch on Windows
      port: 5173,
      clientPort: 5173,
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
