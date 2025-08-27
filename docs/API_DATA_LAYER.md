# API & Data Layer Documentation

This document describes the API and data layer improvements implemented for the Rent-a-Car UI application.

## Overview

The API & Data Layer has been enhanced with:

1. **Extended Reservation Endpoints** - Complete CRUD operations for reservations
2. **Error Normalization Utility** - Consistent error handling across the application
3. **Global Query Error Handling** - Centralized error management with retry policies
4. **MSW Mock Handlers** - Comprehensive mocking for offline development and testing

## 1. Reservation Endpoints

### New Query Functions

The following reservation-related functions have been added to `src/lib/api/queries.ts`:

```typescript
// List reservations with filtering and pagination
listReservations(params: ReservationSearchParams)

// Get a specific reservation by ID
getReservationById(id: number)

// Create a new reservation
createReservation(reservation: ReservationRequestDto)

// Update an existing reservation
updateReservation(id: number, reservation: ReservationRequestDto)

// Reservation status management
confirmReservation(id: number)
cancelReservation(id: number)
completeReservation(id: number)
```

### Types

All reservation types are properly typed using the generated OpenAPI schema:

- `ReservationResponseDto` - Full reservation data with related entities
- `ReservationRequestDto` - Data required to create/update reservations
- `PageReservationResponseDto` - Paginated reservation responses
- `ReservationSearchParams` - Query parameters for filtering reservations

## 2. Error Normalization Utility

### Location
`src/lib/api/errors.ts`

### Key Features

- **Consistent Error Format**: All errors are normalized to a standard `ApiError` interface
- **Error Code Mapping**: HTTP status codes are mapped to semantic error codes
- **User-Friendly Messages**: Technical errors are converted to user-readable messages
- **Validation Error Extraction**: Special handling for form validation errors

### Usage

```typescript
import { normalizeError, getErrorMessage, isValidationError } from '@/lib/api/errors';

try {
  await createReservation(data);
} catch (error) {
  const normalizedError = normalizeError(error);
  const message = getErrorMessage(normalizedError);
  
  if (isValidationError(normalizedError)) {
    const fieldErrors = extractValidationErrors(normalizedError);
    // Handle form field errors
  }
}
```

### Error Codes

Common error codes include:
- `NETWORK_ERROR` - Connection issues
- `VALIDATION_ERROR` - Form validation failures
- `RESOURCE_NOT_FOUND` - 404 errors
- `RESOURCE_CONFLICT` - 409 conflicts
- `CAR_NOT_AVAILABLE` - Business rule violations
- `RESERVATION_OVERLAP` - Date conflicts

## 3. Global Query Configuration

### Location
`src/lib/query/config.ts`

### Features

- **Retry Policies**: Different retry strategies for queries vs mutations
- **Error Handling**: Global error handlers with toast notifications
- **Query Key Factories**: Consistent cache key management
- **Invalidation Helpers**: Automatic cache invalidation after mutations

### Configuration

```typescript
// Queries retry up to 3 times for server errors
// Mutations only retry for network errors to avoid duplicates
const RETRY_CONFIG = {
  query: {
    retry: (failureCount, error) => { /* smart retry logic */ },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  },
  mutation: {
    retry: (failureCount, error) => { /* conservative retry */ },
    retryDelay: 1000,
  },
};
```

### Query Keys

Structured query keys for consistent caching:

```typescript
queryKeys.reservations.all          // ['reservations']
queryKeys.reservations.list(params) // ['reservations', 'list', params]
queryKeys.reservations.detail(id)   // ['reservations', 'detail', id]
```

## 4. Error Boundary Components

### Location
`src/components/ErrorBoundary.tsx`

### Components

- **ErrorBoundary**: Catches JavaScript errors in component tree
- **QueryErrorBoundary**: Specifically handles TanStack Query errors

### Features

- Development error details
- User-friendly error messages
- Retry functionality
- Automatic error reporting (ready for services like Sentry)

## 5. MSW Mock Handlers

### Location
`src/lib/mocks/`

### Structure

```
src/lib/mocks/
├── data.ts      # Mock data and utilities
├── handlers.ts  # MSW request handlers
├── browser.ts   # Browser MSW setup
├── server.ts    # Node.js MSW setup (for tests)
└── index.ts     # Exports
```

### Mock Data

Realistic seed data includes:
- 3 branches (Downtown, Airport, Suburban)
- 5 cars with different categories and statuses
- 3 customers with complete profiles
- 3 reservations in different states

### Endpoints Covered

All major API endpoints are mocked:
- Branches: List with pagination
- Cars: List, search, availability check, details
- Customers: CRUD operations with validation
- Reservations: Full lifecycle management

### Usage

#### Development Mode

1. Copy `.env.example` to `.env.local`
2. Set `VITE_ENABLE_MOCKING=true`
3. Run `npm run msw:init` (first time only)
4. Start development server: `npm run dev`

#### Testing

MSW is automatically enabled in tests via `src/setupTests.ts`.

### Features

- **Realistic Delays**: Simulates network latency
- **Validation**: Proper error responses for invalid data
- **Filtering**: Search and filter functionality
- **Pagination**: Proper paginated responses
- **State Management**: In-memory data persistence during session

## 6. Integration

### Updated Files

- `src/main.tsx` - Added error boundaries and MSW initialization
- `src/lib/api/queries.ts` - Extended with reservation endpoints and error handling
- `src/setupTests.ts` - MSW server setup for tests
- `package.json` - Added MSW initialization script

### Environment Variables

```bash
# API Configuration
VITE_API_BASE_URL=http://localhost:8080

# Development Configuration
VITE_ENABLE_MOCKING=false  # Set to 'true' to enable MSW
```

## 7. Best Practices

### Error Handling

1. Always use the normalized error format
2. Show user-friendly messages in the UI
3. Log technical details for debugging
4. Handle validation errors at the form level

### Query Management

1. Use the provided query key factories
2. Invalidate related queries after mutations
3. Let the global error handler manage most errors
4. Override error handling only when necessary

### Testing

1. MSW handlers provide realistic API responses
2. Test both success and error scenarios
3. Use the mock data utilities for consistent test data
4. Reset handlers between tests for isolation

## 8. Future Enhancements

- Add request/response interceptors for logging
- Implement optimistic updates for better UX
- Add offline support with background sync
- Integrate error reporting service (Sentry, Bugsnag)
- Add request deduplication for identical queries
- Implement query prefetching for better performance
