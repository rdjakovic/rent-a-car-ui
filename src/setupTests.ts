import "@testing-library/jest-dom";
import { server } from '@/lib/mocks/server';
import { TestCleanup } from '@/lib/test-cleanup';

// Mock scrollIntoView for Radix UI components
Object.defineProperty(Element.prototype, 'scrollIntoView', {
  value: vi.fn(),
  writable: true,
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock matchMedia for responsive components
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

// Establish API mocking before all tests
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

// Comprehensive cleanup after each test to ensure isolation
afterEach(async () => {
  // Reset MSW handlers
  server.resetHandlers();
  
  // Perform complete cleanup (disable problematic parts for now)
  await TestCleanup.completeCleanup({
    stores: true,
    dom: false, // Disable DOM cleanup that causes scrollTo issues
    storage: true,
    network: false, // Disable network cleanup that requires MSW
    timers: true,
  });
});

// Clean up after all tests are finished
afterAll(() => {
  server.close();
});
