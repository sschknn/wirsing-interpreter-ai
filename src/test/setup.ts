/**
 * Test-Setup für Vitest + React Testing Library
 * 
 * Konfiguriert globales Test-Environment und Mock-Strategien
 */

// Import Testing Library Matchers
import '@testing-library/jest-dom';
import { vi, beforeAll, afterEach } from 'vitest';

// Globale Test-Konfiguration
beforeAll(() => {
  // Mock für window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // Deprecated
      removeListener: vi.fn(), // Deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // Mock für ResizeObserver
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  // Mock für IntersectionObserver
  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  // Mock für Web Performance API
  global.performance = {
    ...global.performance,
    now: vi.fn(() => Date.now()),
    mark: vi.fn(),
    measure: vi.fn(),
    getEntriesByName: vi.fn(() => []),
    getEntriesByType: vi.fn(() => []),
  };
});

// Mock für process.env (für Node.js Tests)
if (typeof process === 'undefined') {
  (global as any).process = {
    env: {},
    nextTick: (cb: Function) => setTimeout(cb, 0),
  };
}

// Cleanup nach jedem Test
afterEach(() => {
  vi.clearAllMocks();
});