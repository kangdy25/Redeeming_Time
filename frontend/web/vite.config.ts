import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiBaseUrl = process.env.VITE_API_BASE_URL ?? env.VITE_API_BASE_URL ?? '';

  return {
    plugins: [react()],
    define: {
      'globalThis.__REDEEMING_TIME_WEB_API_BASE_URL__': JSON.stringify(apiBaseUrl),
    },
    server: {
      port: 5173,
    },
  };
});
