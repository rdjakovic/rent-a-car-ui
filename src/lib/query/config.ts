import { QueryClient, DefaultOptions } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { normalizeError, isNetworkError, getErrorMessage, type ApiError } from '@/lib/api/errors';

/**
 * Retry configuration for different types of operations
 */
export const RETRY_CONFIG = {
  // Read operations - more aggressive retries
  query: {
    retry: (failureCount: number, error: any) => {
      const normalizedError = normalizeError(error);
      
      // Don't retry client errors (4xx) except for network issues
      if (normalizedError.status && normalizedError.status >= 400 && normalizedError.status < 500) {
        return isNetworkError(normalizedError) && failureCount < 2;
      }
      
      // Retry server errors (5xx) and network errors up to 3 times
      return failureCount < 3;
    },
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
  },
  
  // Write operations - more conservative retries
  mutation: {
    retry: (failureCount: number, error: any) => {
      const normalizedError = normalizeError(error);
      
      // Only retry network errors for mutations to avoid duplicate operations
      return isNetworkError(normalizedError) && failureCount < 1;
    },
    retryDelay: 1000,
  },
} as const;

/**
 * Global error handler for queries
 */
function handleQueryError(error: any) {
  const normalizedError = normalizeError(error);
  
  // Don't show toast for certain error types that are handled locally
  const silentErrors = [
    'UNAUTHORIZED', // Usually handled by auth system
    'RESOURCE_NOT_FOUND', // Often expected in conditional queries
  ];
  
  if (!silentErrors.includes(normalizedError.code || '')) {
    toast({
      title: 'Error',
      description: getErrorMessage(normalizedError),
      variant: 'destructive',
    });
  }
  
  console.error('Query error:', normalizedError);
}

/**
 * Global error handler for mutations
 */
function handleMutationError(error: any) {
  const normalizedError = normalizeError(error);
  
  // Always show mutation errors as they're user-initiated actions
  toast({
    title: 'Operation Failed',
    description: getErrorMessage(normalizedError),
    variant: 'destructive',
  });
  
  console.error('Mutation error:', normalizedError);
}

/**
 * Default options for TanStack Query
 */
export const queryClientDefaults: DefaultOptions = {
  queries: {
    // Cache data for 5 minutes by default
    staleTime: 5 * 60 * 1000,
    
    // Keep data in cache for 10 minutes
    gcTime: 10 * 60 * 1000,
    
    // Retry configuration
    retry: RETRY_CONFIG.query.retry,
    retryDelay: RETRY_CONFIG.query.retryDelay,
    
    // Error handling
    throwOnError: false, // Let components handle errors locally if needed
    
    // Refetch configuration
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  },
  
  mutations: {
    // Retry configuration for mutations
    retry: RETRY_CONFIG.mutation.retry,
    retryDelay: RETRY_CONFIG.mutation.retryDelay,
    
    // Error handling
    onError: handleMutationError,
    
    // Success handling
    onSuccess: () => {
      // Could add global success handling here if needed
    },
  },
};

/**
 * Creates a configured QueryClient instance
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: queryClientDefaults,
  });
}

/**
 * Query key factories for consistent cache management
 */
export const queryKeys = {
  // Branches
  branches: {
    all: ['branches'] as const,
    lists: () => [...queryKeys.branches.all, 'list'] as const,
    list: (params?: any) => [...queryKeys.branches.lists(), params] as const,
    details: () => [...queryKeys.branches.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.branches.details(), id] as const,
  },
  
  // Cars
  cars: {
    all: ['cars'] as const,
    lists: () => [...queryKeys.cars.all, 'list'] as const,
    list: (params?: any) => [...queryKeys.cars.lists(), params] as const,
    details: () => [...queryKeys.cars.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.cars.details(), id] as const,
    available: (params?: any) => [...queryKeys.cars.all, 'available', params] as const,
  },
  
  // Customers
  customers: {
    all: ['customers'] as const,
    lists: () => [...queryKeys.customers.all, 'list'] as const,
    list: (params?: any) => [...queryKeys.customers.lists(), params] as const,
    details: () => [...queryKeys.customers.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.customers.details(), id] as const,
  },
  
  // Reservations
  reservations: {
    all: ['reservations'] as const,
    lists: () => [...queryKeys.reservations.all, 'list'] as const,
    list: (params?: any) => [...queryKeys.reservations.lists(), params] as const,
    details: () => [...queryKeys.reservations.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.reservations.details(), id] as const,
  },
} as const;

/**
 * Mutation key factories for consistent mutation management
 */
export const mutationKeys = {
  // Customers
  createCustomer: ['customers', 'create'] as const,
  updateCustomer: (id: number) => ['customers', 'update', id] as const,
  deleteCustomer: (id: number) => ['customers', 'delete', id] as const,
  
  // Reservations
  createReservation: ['reservations', 'create'] as const,
  updateReservation: (id: number) => ['reservations', 'update', id] as const,
  confirmReservation: (id: number) => ['reservations', 'confirm', id] as const,
  cancelReservation: (id: number) => ['reservations', 'cancel', id] as const,
  completeReservation: (id: number) => ['reservations', 'complete', id] as const,
} as const;

/**
 * Utility function to invalidate related queries after mutations
 */
export function getInvalidationQueries(mutationType: string, entityId?: number) {
  const invalidations: any[][] = [];
  
  switch (mutationType) {
    case 'createCustomer':
    case 'updateCustomer':
    case 'deleteCustomer':
      invalidations.push(queryKeys.customers.all);
      if (entityId) {
        invalidations.push(queryKeys.customers.detail(entityId));
      }
      break;
      
    case 'createReservation':
    case 'updateReservation':
    case 'confirmReservation':
    case 'cancelReservation':
    case 'completeReservation':
      invalidations.push(queryKeys.reservations.all);
      invalidations.push(queryKeys.cars.all); // Car availability might change
      if (entityId) {
        invalidations.push(queryKeys.reservations.detail(entityId));
      }
      break;
  }
  
  return invalidations;
}
