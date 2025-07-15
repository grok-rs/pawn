import '@testing-library/jest-dom';
import { beforeAll, afterEach, afterAll, vi } from 'vitest';
import { server } from './mocks/server';

// Silence console outputs during tests
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
} as any;

// Establish API mocking before all tests
beforeAll(() => server.listen());

// Reset any request handlers that we may add during the tests
afterEach(() => server.resetHandlers());

// Clean up after the tests are finished
afterAll(() => server.close());

// Mock Tauri API for testing
declare global {
  interface Window {
    __TAURI__: any;
  }
}

window.__TAURI__ = {
  tauri: {
    invoke: vi.fn(),
  },
  event: {
    listen: vi.fn(),
    emit: vi.fn(),
  },
  window: {
    appWindow: {
      listen: vi.fn(),
      emit: vi.fn(),
    },
  },
};

// Global test utilities
(globalThis as any).ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
(globalThis as any).IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock React warnings during tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning:') &&
      (args[0].includes('act(...)') || args[0].includes('useEffect'))
    ) {
      // Suppress React warnings during tests
      return;
    }
    originalError.call(console, ...args);
  };
});
