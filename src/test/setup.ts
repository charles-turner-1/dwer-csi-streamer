import { config } from "@vue/test-utils";

// Global test setup for Vue Test Utils
// This file runs before all test files

// Configure Vue Test Utils global options
config.global.stubs = {
  // Add global component stubs here if needed
  // Example: 'RouterLink': true
};

// ResizeObserver is used by maplibre-gl and PrimeVue; happy-dom doesn't include it
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// HTMLCanvasElement.getContext is needed by maplibre-gl
HTMLCanvasElement.prototype.getContext = () => null;

// Add any global mocks or configuration here
// Example: mock window.matchMedia for responsive tests
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  }),
});
