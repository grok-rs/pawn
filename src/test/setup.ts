import '@testing-library/jest-dom';
import { beforeAll, afterEach, afterAll, vi } from 'vitest';
import { server } from './mocks/server';

// Silence console outputs during tests
const originalConsole = globalThis.console;
Object.defineProperty(globalThis, 'console', {
  value: {
    ...originalConsole,
    log: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  configurable: true,
});

// Establish API mocking before all tests
beforeAll(() => server.listen());

// Reset any request handlers that we may add during the tests
afterEach(() => server.resetHandlers());

// Clean up after the tests are finished
afterAll(() => server.close());

// Mock Tauri API for testing
declare global {
  interface Window {
    __TAURI__: {
      tauri: {
        invoke: typeof vi.fn;
      };
      event: {
        listen: typeof vi.fn;
        emit: typeof vi.fn;
      };
      window: {
        appWindow: {
          listen: typeof vi.fn;
          emit: typeof vi.fn;
        };
      };
    };
    __TAURI_INTERNALS__: {
      invoke: typeof vi.fn;
    };
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

// Mock Tauri internals for newer API
window.__TAURI_INTERNALS__ = {
  invoke: vi.fn(),
};

// Global test utilities
Object.defineProperty(globalThis, 'ResizeObserver', {
  value: vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  })),
  configurable: true,
});

// Mock IntersectionObserver
Object.defineProperty(globalThis, 'IntersectionObserver', {
  value: vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  })),
  configurable: true,
});

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
