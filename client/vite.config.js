import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const modePort = {
  super: 5173,
  admin: 5174,
  am: 5175,
  dealer: 5176,
};

const proxy = {
  '/api': { target: 'http://localhost:5000', changeOrigin: true },
  '/uploads': { target: 'http://localhost:5000', changeOrigin: true },
};

export default defineConfig(({ mode }) => {
  const port = modePort[mode] || 5173;
  return {
    plugins: [react()],
    server: { port, strictPort: true, proxy },
    preview: { port, proxy },
  };
});
