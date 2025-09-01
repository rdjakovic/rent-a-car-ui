import { vi } from 'vitest';
import { useBookingFlowStore } from '@/stores/useBookingFlowStore';

/**
 * Comprehensive test cleanup utilities for ensuring test isolation
 */

// Store cleanup utilities
export class StoreCleanup {
  /**
   * Reset all Zustand stores to their initial state
   */
  static resetAllStores() {
    // Reset booking flow store
    useBookingFlowStore.getState().reset();
    
    // Add other store resets here as needed
    // Example: useSearchStore.getState().reset();
  }

  /**
   * Reset specific store to initial state
   */
  static resetBookingFlowStore() {
    useBookingFlowStore.getState().reset();
  }

  /**
   * Verify store is in clean state (useful for debugging test isolation issues)
   */
  static verifyStoreCleanState() {
    const bookingState = useBookingFlowStore.getState();
    
    const isClean = 
      bookingState.carDetails === null &&
      bookingState.bookingDetails === null &&
      bookingState.customer === null &&
      bookingState.reservation === null &&
      bookingState.currentStep === 'customer' &&
      bookingState.totalDays === 0 &&
      bookingState.totalCost === 0 &&
      !bookingState.isSubmitting &&
      bookingState.submissionError === null;

    if (!isClean) {
      console.warn('Store is not in clean state:', bookingState);
    }

    return isClean;
  }
}

// Mock cleanup utilities
export class MockCleanup {
  /**
   * Clear all mock function calls and implementations
   */
  static clearAllMocks(...mocks: ReturnType<typeof vi.fn>[]) {
    mocks.forEach(mock => {
      if (mock && typeof mock.mockClear === 'function') {
        mock.mockClear();
      }
    });
  }

  /**
   * Reset all mock function implementations to default
   */
  static resetAllMocks(...mocks: ReturnType<typeof vi.fn>[]) {
    mocks.forEach(mock => {
      if (mock && typeof mock.mockReset === 'function') {
        mock.mockReset();
      }
    });
  }

  /**
   * Restore all mock function implementations to original
   */
  static restoreAllMocks(...mocks: ReturnType<typeof vi.fn>[]) {
    mocks.forEach(mock => {
      if (mock && typeof mock.mockRestore === 'function') {
        mock.mockRestore();
      }
    });
  }

  /**
   * Clear mock timers and restore real timers
   */
  static clearTimers() {
    vi.clearAllTimers();
    vi.useRealTimers();
  }
}

// DOM cleanup utilities
export class DOMCleanup {
  /**
   * Clear any remaining DOM elements that might affect other tests
   */
  static clearDOM() {
    // Clear any modal or portal elements
    const modals = document.querySelectorAll('[data-radix-portal]');
    modals.forEach(modal => modal.remove());

    // Clear any tooltip or popover elements
    const tooltips = document.querySelectorAll('[data-radix-tooltip-content]');
    tooltips.forEach(tooltip => tooltip.remove());

    // Clear any toast notifications
    const toasts = document.querySelectorAll('[data-sonner-toast]');
    toasts.forEach(toast => toast.remove());

    // Reset document title
    document.title = 'Test';

    // Clear any custom CSS classes on body
    document.body.className = '';
  }

  /**
   * Reset viewport and scroll position
   */
  static resetViewport() {
    // Reset scroll position (mock for jsdom)
    try {
      window.scrollTo(0, 0);
    } catch (error) {
      // scrollTo might not be implemented in jsdom
    }

    // Reset any custom viewport meta tags
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    if (viewportMeta) {
      viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1');
    }
  }
}

// Local storage and session storage cleanup
export class StorageCleanup {
  /**
   * Clear all local storage
   */
  static clearLocalStorage() {
    localStorage.clear();
  }

  /**
   * Clear all session storage
   */
  static clearSessionStorage() {
    sessionStorage.clear();
  }

  /**
   * Clear all browser storage
   */
  static clearAllStorage() {
    this.clearLocalStorage();
    this.clearSessionStorage();
  }

  /**
   * Clear specific storage keys
   */
  static clearStorageKeys(...keys: string[]) {
    keys.forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
  }
}

// Network and API cleanup
export class NetworkCleanup {
  /**
   * Clear any pending network requests
   */
  static clearPendingRequests() {
    // This would be implemented based on your HTTP client
    // For example, if using axios, you might cancel pending requests
    // or if using fetch, you might abort controllers
  }

  /**
   * Reset MSW handlers to default state
   */
  static resetMSWHandlers() {
    // This is handled in setupTests.ts with server.resetHandlers()
    // but can be called explicitly if needed
    try {
      const { server } = require('@/lib/mocks/server');
      server.resetHandlers();
    } catch (error) {
      // MSW server might not be available in all test environments
      console.warn('MSW server not available for reset');
    }
  }
}

// Console cleanup utilities
export class ConsoleCleanup {
  private static originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
  };

  /**
   * Mock console methods to prevent noise in test output
   */
  static mockConsole() {
    console.log = vi.fn();
    console.warn = vi.fn();
    console.error = vi.fn();
    console.info = vi.fn();
  }

  /**
   * Restore original console methods
   */
  static restoreConsole() {
    console.log = this.originalConsole.log;
    console.warn = this.originalConsole.warn;
    console.error = this.originalConsole.error;
    console.info = this.originalConsole.info;
  }

  /**
   * Clear console mock calls
   */
  static clearConsoleMocks() {
    if (vi.isMockFunction(console.log)) {
      (console.log as any).mockClear();
    }
    if (vi.isMockFunction(console.warn)) {
      (console.warn as any).mockClear();
    }
    if (vi.isMockFunction(console.error)) {
      (console.error as any).mockClear();
    }
    if (vi.isMockFunction(console.info)) {
      (console.info as any).mockClear();
    }
  }
}

// Comprehensive cleanup utility
export class TestCleanup {
  /**
   * Perform complete cleanup between tests
   */
  static async completeCleanup(options: {
    stores?: boolean;
    mocks?: ReturnType<typeof vi.fn>[];
    dom?: boolean;
    storage?: boolean;
    network?: boolean;
    console?: boolean;
    timers?: boolean;
  } = {}) {
    const {
      stores = true,
      mocks = [],
      dom = true,
      storage = true,
      network = true,
      console = false,
      timers = true,
    } = options;

    // Reset stores
    if (stores) {
      StoreCleanup.resetAllStores();
    }

    // Clear mocks
    if (mocks.length > 0) {
      MockCleanup.clearAllMocks(...mocks);
    }

    // Clear DOM
    if (dom) {
      DOMCleanup.clearDOM();
      DOMCleanup.resetViewport();
    }

    // Clear storage
    if (storage) {
      StorageCleanup.clearAllStorage();
    }

    // Clear network
    if (network) {
      NetworkCleanup.resetMSWHandlers();
    }

    // Clear console
    if (console) {
      ConsoleCleanup.clearConsoleMocks();
    }

    // Clear timers
    if (timers) {
      MockCleanup.clearTimers();
    }

    // Wait for any pending async operations
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  /**
   * Quick cleanup for simple tests
   */
  static quickCleanup(...mocks: ReturnType<typeof vi.fn>[]) {
    StoreCleanup.resetAllStores();
    MockCleanup.clearAllMocks(...mocks);
  }

  /**
   * Verify test environment is clean (useful for debugging)
   */
  static verifyCleanEnvironment(): {
    isClean: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // Check stores
    if (!StoreCleanup.verifyStoreCleanState()) {
      issues.push('Stores are not in clean state');
    }

    // Check DOM
    const modals = document.querySelectorAll('[data-radix-portal]');
    if (modals.length > 0) {
      issues.push(`${modals.length} modal elements still in DOM`);
    }

    // Check storage
    if (localStorage.length > 0) {
      issues.push(`${localStorage.length} items in localStorage`);
    }

    if (sessionStorage.length > 0) {
      issues.push(`${sessionStorage.length} items in sessionStorage`);
    }

    return {
      isClean: issues.length === 0,
      issues,
    };
  }
}

// Export convenience functions
export const cleanupMocks = MockCleanup.clearAllMocks;
export const resetStores = StoreCleanup.resetAllStores;
export const completeCleanup = TestCleanup.completeCleanup;
export const quickCleanup = TestCleanup.quickCleanup;