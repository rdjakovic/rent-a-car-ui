# Design Document

## Overview

The Reservations/Booking System will be implemented as a multi-step booking flow that integrates with the existing availability search and customer management systems. The design follows the established patterns in the codebase using React Router for navigation, TanStack Query for data fetching, React Hook Form with Zod for validation, and the existing UI component library.

The system consists of three main components:
1. **Booking Flow** - Multi-step wizard initiated from availability results
2. **Reservations Management** - List, search, and manage existing reservations
3. **Integration Points** - Seamless handoff from availability search and customer selection

## Architecture

### Component Structure
```
src/features/reservations/
├── ReservationsPage.tsx          # Main reservations list/search page
├── BookingFlow/
│   ├── BookingWizard.tsx         # Main booking flow container
│   ├── CustomerSelection.tsx     # Customer search/select/create step
│   ├── BookingReview.tsx         # Review and confirmation step
│   └── BookingConfirmation.tsx   # Success confirmation screen
├── components/
│   ├── ReservationCard.tsx       # Individual reservation display
│   ├── ReservationFilters.tsx    # Search and filter controls
│   └── BookingProgress.tsx       # Progress indicator for wizard
└── hooks/
    ├── useBookingFlow.ts         # Booking state management
    └── useReservationActions.ts  # Reservation CRUD operations
```

### State Management
- **Booking Flow State**: Zustand store for managing multi-step booking process
- **Form State**: React Hook Form for individual step validation
- **Server State**: TanStack Query for API data and caching
- **URL State**: React Router for navigation and deep linking

### API Integration
The system leverages existing reservation endpoints in `src/lib/api/queries.ts`:
- `createReservation()` - Create new reservation
- `listReservations()` - List with search/filter
- `getReservationById()` - Get reservation details
- `updateReservation()` - Modify existing reservation
- `confirmReservation()` - Confirm pending reservation
- `cancelReservation()` - Cancel reservation

## Components and Interfaces

### BookingWizard Component
**Purpose**: Orchestrates the multi-step booking process
**Props**:
```typescript
interface BookingWizardProps {
  initialData?: {
    carId: number;
    branchId: number;
    startDate: string;
    endDate: string;
    dailyPrice: number;
  };
  onComplete: (reservationId: number) => void;
  onCancel: () => void;
}
```

**State Management**:
```typescript
interface BookingState {
  step: 'customer' | 'review' | 'confirmation';
  carDetails: CarListResponseDto;
  bookingDetails: {
    carId: number;
    branchId: number;
    startDate: string;
    endDate: string;
    dailyPrice: number;
  };
  selectedCustomer: CustomerResponseDto | null;
  totalCost: number;
  reservationId: number | null;
}
```

### CustomerSelection Component
**Purpose**: Handle customer search, selection, and inline creation
**Features**:
- Search existing customers by name, email, phone, license
- Display search results in selectable list
- Inline customer creation form
- Validation for driver license requirements

### BookingReview Component
**Purpose**: Display comprehensive booking summary and handle submission
**Features**:
- Show all booking details (car, customer, dates, pricing)
- Calculate total cost (daily rate × number of days)
- Final validation before submission
- Loading states during API calls

### ReservationsPage Component
**Purpose**: Main reservations management interface
**Features**:
- Paginated reservations list
- Search and filter controls (customer, dates, status)
- Reservation status management (confirm, cancel, complete)
- Navigation to booking flow for new reservations

## Data Models

### Booking Flow State
```typescript
interface BookingFlowState {
  // Current step in the wizard
  currentStep: 'customer' | 'review' | 'confirmation';
  
  // Pre-filled from availability search
  carDetails: {
    id: number;
    displayName: string;
    category: string;
    dailyPrice: number;
    branchId: number;
    branchName: string;
  };
  
  // Booking parameters
  bookingDetails: {
    startDate: string; // ISO date
    endDate: string;   // ISO date
    totalDays: number;
    totalCost: number;
  };
  
  // Selected customer
  customer: CustomerResponseDto | null;
  
  // Result after successful booking
  reservation: ReservationResponseDto | null;
  
  // Actions
  setCustomer: (customer: CustomerResponseDto) => void;
  calculateCost: () => void;
  nextStep: () => void;
  previousStep: () => void;
  reset: () => void;
}
```

### Reservation Search Parameters
```typescript
interface ReservationSearchParams {
  search?: string;           // Customer name or reservation number
  status?: ReservationStatus;
  startDate?: string;        // Filter by pickup date range
  endDate?: string;
  customerId?: number;
  page?: number;
  size?: number;
  sort?: string[];
}
```

## Error Handling

### Validation Errors
- **Customer Selection**: Validate driver license exists and is not expired
- **Date Validation**: Ensure pickup/return dates are valid and in future
- **Availability Conflicts**: Handle cases where car becomes unavailable during booking

### API Errors
- **Network Failures**: Retry mechanisms with exponential backoff
- **Validation Errors**: Display field-specific error messages
- **Conflict Errors**: Handle reservation conflicts gracefully
- **Server Errors**: Generic error handling with user-friendly messages

### Error Recovery
- **Form State Preservation**: Maintain user input during errors
- **Retry Actions**: Allow users to retry failed operations
- **Fallback Navigation**: Provide alternative paths when operations fail

## Testing Strategy

### Unit Tests
- **Booking Flow Logic**: Test state transitions and calculations
- **Form Validation**: Test customer selection and booking validation
- **API Query Functions**: Test reservation CRUD operations
- **Utility Functions**: Test date calculations and cost computations

### Integration Tests
- **Booking Flow E2E**: Test complete booking process from availability to confirmation
- **Customer Integration**: Test customer search, selection, and creation within booking
- **Reservation Management**: Test reservation list, search, and status updates
- **Error Scenarios**: Test error handling and recovery flows

### Component Tests
- **BookingWizard**: Test step navigation and state management
- **CustomerSelection**: Test search functionality and customer creation
- **ReservationsPage**: Test filtering, pagination, and reservation actions
- **Form Components**: Test validation and submission handling

## Navigation and Routing

### Route Structure
```typescript
// New routes to add to App.tsx
<Route path="/book" element={<BookingWizard />} />
<Route path="/reservations" element={<ReservationsPage />} />
<Route path="/reservations/:id" element={<ReservationDetails />} />
```

### Navigation Flow
1. **Availability → Booking**: Click "Book" button passes car and date parameters
2. **Booking → Confirmation**: Successful booking shows confirmation with reservation number
3. **Reservations List**: Access from main navigation for reservation management
4. **Deep Linking**: Support direct links to specific reservations

### URL Parameters
- **Booking Flow**: `/book?carId=123&branchId=456&startDate=2024-01-01&endDate=2024-01-05`
- **Reservation Details**: `/reservations/789`
- **Filtered Reservations**: `/reservations?status=CONFIRMED&customer=john`

## Performance Considerations

### Data Fetching
- **Prefetch Customer Data**: Load customer list when booking flow starts
- **Cache Reservation Data**: Use TanStack Query caching for reservation lists
- **Optimistic Updates**: Update UI immediately for status changes
- **Background Refresh**: Keep reservation data fresh with background updates

### Form Performance
- **Debounced Search**: Debounce customer search input to reduce API calls
- **Lazy Loading**: Load customer details only when selected
- **Form Persistence**: Maintain form state during navigation
- **Validation Optimization**: Client-side validation before API calls

### UI Performance
- **Loading States**: Show appropriate loading indicators during async operations
- **Skeleton Loading**: Use skeleton components for better perceived performance
- **Progressive Enhancement**: Load non-critical features after core functionality
- **Error Boundaries**: Isolate errors to prevent full page crashes