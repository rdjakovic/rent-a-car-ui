import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

// Setup MSW worker for browser environment
export const worker = setupWorker(...handlers);

// Start the worker in development mode
export async function enableMocking() {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  // Check if mocking is enabled via environment variable
  const mockingEnabled = import.meta.env.VITE_ENABLE_MOCKING === 'true';
  
  if (!mockingEnabled) {
    return;
  }

  return worker.start({
    onUnhandledRequest: 'warn',
    serviceWorker: {
      url: '/mockServiceWorker.js',
    },
  });
}
