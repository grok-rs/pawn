/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: [
      'node_modules/',
      'dist/',
      'src-tauri/',
      'src/test/mocks/',
      'src/test/e2e/**',
      '**/*.d.ts',
      '**/*.config.*',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json-summary'],
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
  },
  resolve: {
    alias: {
      '@': '/src',
      '@dto': '/src/dto',
    },
  },
});
