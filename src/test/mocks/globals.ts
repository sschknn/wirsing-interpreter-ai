/**
 * Mock-Services für KI-Integration Tests
 * 
 * Simuliert GoogleGenAI-Verhalten für isolierte Komponenten-Tests
 */

import { vi } from 'vitest';

// Mock für GoogleGenAI
export const mockGoogleGenAI = {
  models: {
    generateContent: vi.fn().mockResolvedValue({
      text: JSON.stringify({
        title: 'Test Präsentation',
        subtitle: 'Mock Subtitle',
        slides: [
          {
            title: 'Test Slide 1',
            type: 'content',
            items: [
              { text: 'Test Item 1', category: 'content', priority: 'mittel' },
              { text: 'Test Item 2', category: 'content', priority: 'mittel' }
            ]
          }
        ]
      }),
      candidates: [{
        content: {
          parts: [
            {
              inlineData: {
                data: 'mock-image-data-base64'
              }
            }
          ]
        }
      }]
    }),
  },
  live: {
    connect: vi.fn().mockResolvedValue({
      close: vi.fn(),
      send: vi.fn(),
    }),
  },
};

// Mock für process.env
vi.stubGlobal('process', {
  env: {
    API_KEY: 'test-api-key',
    GEMINI_API_KEY: 'test-gemini-api-key',
  },
});

// Mock für PerformanceObserver
global.PerformanceObserver = vi.fn().mockImplementation((callback) => {
  const observer = {
    observe: vi.fn(),
    disconnect: vi.fn(),
    takeRecords: vi.fn(() => []),
  };
  // Simuliere ein Performance Entry
  callback({
    getEntries: vi.fn(() => [{
      name: 'test-entry',
      startTime: 100,
      duration: 50,
    }]),
    getEntriesByType: vi.fn(() => []),
  });
  return observer;
});

// Mock für window.location
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000',
    pathname: '/',
    protocol: 'http:',
    host: 'localhost:3000',
  },
  writable: true,
});

// Mock für localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
vi.stubGlobal('localStorage', localStorageMock);

// Mock für fetch
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({}),
  text: () => Promise.resolve(''),
});