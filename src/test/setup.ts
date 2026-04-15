import { config } from "@vue/test-utils";

// Global test setup for Vue Test Utils
// This file runs before all test files

// Configure Vue Test Utils global options
config.global.stubs = {
  // Add global component stubs here if needed
  // Example: 'RouterLink': true
};

// ResizeObserver is used by maplibre-gl and PrimeVue; happy-dom doesn't include it
class ResizeObserverMock implements ResizeObserver {
  constructor(_callback: ResizeObserverCallback) {}
  observe(_target: Element, _options?: ResizeObserverOptions): void {}
  unobserve(_target: Element): void {}
  disconnect(): void {}
}
globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

// HTMLCanvasElement.getContext is needed by maplibre-gl
HTMLCanvasElement.prototype.getContext = (_contextId: string, _options?: unknown) => null;

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
