import "@testing-library/jest-dom";
import { server } from '@/lib/mocks/server';

// jsdom does not implement scrollIntoView; Radix UI's Select calls it internally.
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || (() => {});

// Establish API mocking before all tests
beforeAll(() => server.listen());

// Reset any request handlers that we may add during the tests,
// so they don't affect other tests
afterEach(() => server.resetHandlers());

// Clean up after the tests are finished
afterAll(() => server.close());
