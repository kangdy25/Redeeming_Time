import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    exclude: ['e2e/**', 'node_modules/**'],
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
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['shared/src/**/*.{ts,tsx}', 'web/src/**/*.{ts,tsx}'],
      exclude: ['**/*.test.{ts,tsx}', '**/*.d.ts', '**/main.tsx'],
      thresholds: {
        lines: 50,
        functions: 50,
        statements: 50,
        branches: 45,
      },
    },
  },
});
