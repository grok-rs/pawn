/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
    ],
    exclude: [
      'node_modules/',
      'dist/',
      'src-tauri/',
      'src/test/**',
      'src/dto/**',
      '**/*.d.ts',
      '**/*.config.*',
    ],
    // Test timeout for async operations
    testTimeout: 10000,
    hookTimeout: 10000,
    // Silence console outputs during tests
    silent: true,
    // Optimized: Use all available CPU threads for parallel test execution
    pool: 'threads',
    poolOptions: {
      threads: {
        maxThreads: 4,
        minThreads: 1,
      },
    },
  },
  resolve: {
    alias: {
      '@': '/src',
      '@dto': '/src/dto',
      '@app': '/src/app',
      '@pages': '/src/pages',
      '@widgets': '/src/widgets',
      '@features': '/src/features',
      '@entities': '/src/entities',
      '@shared': '/src/shared',
    },
  },
});
