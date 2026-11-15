import "@testing-library/jest-dom";
import { server } from '@/lib/mocks/server';
import { resetFilterStores } from '@/stores/filterStore';

// jsdom does not implement scrollIntoView; Radix UI's Select calls it internally.
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || (() => {});

// jsdom does not implement ResizeObserver; Radix UI's Checkbox uses it to measure itself.
globalThis.ResizeObserver = globalThis.ResizeObserver || class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Establish API mocking before all tests. This runs before the test file is imported on purpose: the API client
// captures globalThis.fetch when it is created, so listening later (e.g. in beforeAll) would leave it unpatched.
server.listen();

// Reset any request handlers that we may add during the tests,
// so they don't affect other tests
afterEach(() => {
  server.resetHandlers();
  // Saved page filters would otherwise leak from one test into the next
  resetFilterStores();
});

// Clean up after the tests are finished
afterAll(() => server.close());
