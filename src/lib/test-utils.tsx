import React from 'react';
import { render, RenderOptions, waitFor, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';

// Enhanced timeout configurations for different types of operations
export const TEST_TIMEOUTS = {
  FAST: 1000,        // For immediate state changes
  NORMAL: 3000,      // For typical async operations
  SLOW: 5000,        // For complex operations or API calls
  VERY_SLOW: 10000,  // For integration tests or heavy operations
} as const;

// Custom render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialEntries?: string[];
  queryClientOptions?: {
    defaultOptions?: {
      queries?: Record<string, any>;
      mutations?: Record<string, any>;
    };
  };
}

export function renderWithProviders(
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) {
  const {
    initialEntries = ['/'],
    queryClientOptions = {},
    ...renderOptions
  } = options;

  // Create a fresh QueryClient for each test to ensure isolation
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0,
        ...queryClientOptions.defaultOptions?.queries,
      },
      mutations: {
        retry: false,
        ...queryClientOptions.defaultOptions?.mutations,
      },
    },
  });

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={initialEntries}>
          {children}
        </MemoryRouter>
      </QueryClientProvider>
    );
  }

  const result = render(ui, { wrapper: Wrapper, ...renderOptions });

  return {
    ...result,
    queryClient,
  };
}

// Enhanced waitFor with better error messages and timeout handling
export async function waitForElement(
  callback: () => HTMLElement | null,
  options: {
    timeout?: number;
    interval?: number;
    onTimeout?: (lastError: Error) => void;
  } = {}
) {
  const { timeout = TEST_TIMEOUTS.NORMAL, interval = 50, onTimeout } = options;

  try {
    return await waitFor(callback, { timeout, interval });
  } catch (error) {
    if (onTimeout) {
      onTimeout(error as Error);
    }
    throw new Error(
      `Element not found within ${timeout}ms. ${(error as Error).message}`
    );
  }
}

// Wait for text content with better error handling
export async function waitForText(
  text: string | RegExp,
  options: {
    timeout?: number;
    container?: HTMLElement;
    exact?: boolean;
  } = {}
) {
  const { timeout = TEST_TIMEOUTS.NORMAL, container, exact = true } = options;

  return waitForElement(
    () => {
      const element = container
        ? screen.queryByText(text, { exact, container })
        : screen.queryByText(text, { exact });
      return element;
    },
    {
      timeout,
      onTimeout: () => {
        const availableText = container
          ? container.textContent || 'No text content'
          : document.body.textContent || 'No text content';
        console.error(`Available text content: ${availableText}`);
      },
    }
  );
}

// Wait for element by test id with better error handling
export async function waitForTestId(
  testId: string,
  options: {
    timeout?: number;
    container?: HTMLElement;
  } = {}
) {
  const { timeout = TEST_TIMEOUTS.NORMAL, container } = options;

  return waitForElement(
    () => {
      const element = container
        ? screen.queryByTestId(testId, { container })
        : screen.queryByTestId(testId);
      return element;
    },
    {
      timeout,
      onTimeout: () => {
        const availableTestIds = Array.from(
          document.querySelectorAll('[data-testid]')
        ).map(el => el.getAttribute('data-testid'));
        console.error(`Available test IDs: ${availableTestIds.join(', ')}`);
      },
    }
  );
}

// Wait for element to disappear
export async function waitForElementToDisappear(
  callback: () => HTMLElement | null,
  options: {
    timeout?: number;
    interval?: number;
  } = {}
) {
  const { timeout = TEST_TIMEOUTS.NORMAL, interval = 50 } = options;

  return waitFor(
    () => {
      const element = callback();
      if (element) {
        throw new Error('Element is still present');
      }
    },
    { timeout, interval }
  );
}

// Wait for loading states to complete
export async function waitForLoadingToComplete(
  options: {
    timeout?: number;
    loadingText?: string | RegExp;
  } = {}
) {
  const { timeout = TEST_TIMEOUTS.SLOW, loadingText = /loading/i } = options;

  // First wait for loading to appear (optional)
  try {
    await waitFor(() => screen.getByText(loadingText), { timeout: 1000 });
  } catch {
    // Loading might not appear if operation is very fast
  }

  // Then wait for loading to disappear
  await waitForElementToDisappear(
    () => screen.queryByText(loadingText),
    { timeout }
  );
}

// Wait for async state changes with retry logic
export async function waitForStateChange<T>(
  getState: () => T,
  predicate: (state: T) => boolean,
  options: {
    timeout?: number;
    interval?: number;
    maxRetries?: number;
  } = {}
) {
  const {
    timeout = TEST_TIMEOUTS.NORMAL,
    interval = 50,
    maxRetries = Math.floor(timeout / interval),
  } = options;

  let retries = 0;
  let lastState: T;

  return waitFor(
    () => {
      lastState = getState();
      const result = predicate(lastState);
      
      if (!result) {
        retries++;
        if (retries >= maxRetries) {
          throw new Error(
            `State change not detected after ${retries} retries. Last state: ${JSON.stringify(lastState)}`
          );
        }
        throw new Error('State not ready');
      }
      
      return result;
    },
    { timeout, interval }
  );
}

// Utility to create mock functions with better typing
export function createMockFunction<T extends (...args: any[]) => any>(
  implementation?: T
): ReturnType<typeof vi.fn> & T {
  return vi.fn(implementation) as any;
}

// Utility to create async mock that resolves after a delay
export function createAsyncMock<T>(
  value: T,
  delay: number = 100
): ReturnType<typeof vi.fn> {
  return vi.fn().mockImplementation(
    () => new Promise(resolve => setTimeout(() => resolve(value), delay))
  );
}

// Utility to create async mock that rejects after a delay
export function createAsyncErrorMock(
  error: Error | string,
  delay: number = 100
): ReturnType<typeof vi.fn> {
  return vi.fn().mockImplementation(
    () => new Promise((_, reject) => 
      setTimeout(() => reject(typeof error === 'string' ? new Error(error) : error), delay)
    )
  );
}

// Mock cleanup utility
export function cleanupMocks(...mocks: ReturnType<typeof vi.fn>[]) {
  mocks.forEach(mock => {
    if (mock && typeof mock.mockClear === 'function') {
      mock.mockClear();
    }
  });
}

// Enhanced act utility for complex async operations
export async function actAsync(callback: () => Promise<void> | void) {
  const { act } = await import('@testing-library/react');
  
  if (callback.constructor.name === 'AsyncFunction') {
    await act(async () => {
      await callback();
    });
  } else {
    act(() => {
      callback();
    });
  }
}

// Debug utility to log current DOM state
export function debugCurrentState(container?: HTMLElement) {
  const target = container || document.body;
  console.log('Current DOM state:');
  console.log(target.innerHTML);
  
  const testIds = Array.from(target.querySelectorAll('[data-testid]'))
    .map(el => el.getAttribute('data-testid'));
  console.log('Available test IDs:', testIds);
  
  const textContent = target.textContent || '';
  console.log('Text content:', textContent.slice(0, 500) + (textContent.length > 500 ? '...' : ''));
}

// Re-export commonly used testing utilities
export * from '@testing-library/react';
export { vi } from 'vitest';

// Re-export cleanup utilities
export * from './test-cleanup';