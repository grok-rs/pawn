/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Optimized: Only run unit tests in components, exclude slow integration/e2e tests
    include: [
      'src/components/**/*.{test,spec}.{ts,tsx}',
      'src/utils/**/*.{test,spec}.{ts,tsx}',
      'src/hooks/**/*.{test,spec}.{ts,tsx}',
      'src/contexts/**/*.{test,spec}.{ts,tsx}',
    ],
    exclude: [
      'node_modules/',
      'dist/',
      'src-tauri/',
      'src/test/**',  // Exclude all integration/e2e/stress tests
      '**/*.d.ts',
      '**/*.config.*',
    ],
    coverage: {
      provider: 'v8',
      // Optimized: Only generate lcov for CI (skip slow html/json)
      reporter: ['lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'src/test/',
        'src/**/*.d.ts',
        'src/**/*.config.*',
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/dto/bindings.ts', // Auto-generated types
      ],
      thresholds: {
        global: {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
      },
      // Fail if coverage is below thresholds
      checkCoverage: true,
    },
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
    },
  },
});
