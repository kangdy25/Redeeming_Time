import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [path.resolve(__dirname, './test.setup.ts')],
    alias: {
      'react-native': 'react-native-web',
      '@redeeming-time/shared': path.resolve(__dirname, './shared/src/index.ts'),
    },
    server: {
      deps: {
        inline: ['@redeeming-time/shared'],
      },
    },
  },
});
