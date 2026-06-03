import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: {
      port: 3100,
      open: true,
      // 关闭 Mock 时，将 /api 代理到真实后端
      proxy: env.VITE_ENABLE_MOCK === 'false'
        ? {
            '/api': {
              target: env.VITE_API_PROXY_TARGET || 'http://localhost:3101',
              changeOrigin: true,
            },
            '/health': {
              target: env.VITE_API_PROXY_TARGET || 'http://localhost:3101',
              changeOrigin: true,
            },
            '/snapshots': {
              target: env.VITE_API_PROXY_TARGET || 'http://localhost:3101',
              changeOrigin: true,
            },
          }
        : undefined,
    },
  };
});
