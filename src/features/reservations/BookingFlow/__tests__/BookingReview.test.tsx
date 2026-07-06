import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import BookingReview from '../BookingReview';
import { useBookingFlow } from '@/hooks/useBookingFlow';
import { createReservation } from '@/lib/api/queries';
import type { CustomerResponseDto, CarListResponseDto, ReservationResponseDto } from '@/lib/api/queries';

// Mock the hooks and API
vi.mock('@/hooks/useBookingFlow');
vi.mock('@/lib/api/queries');

const mockUseBookingFlow = vi.mocked(useBookingFlow);
const mockCreateReservation = vi.mocked(createReservation);

// Test data
const mockCustomer: CustomerResponseDto = {
  id: 1,
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  phone: '+1234567890',
  driverLicenseNo: 'DL123456789',
  dateOfBirth: '1990-01-01',
  address: '123 Main St',
  city: 'New York',
  country: 'USA',
  licenseExpiryDate: '2099-12-31',
};

const mockCarDetails: CarListResponseDto = {
  id: 1,
  displayName: 'Toyota Camry 2024',
  category: 'INTERMEDIATE',
  dailyPrice: 45.99,
  branchName: 'Downtown Branch',
};

const mockBookingDetails = {
  carId: 1,
  branchId: 1,
  startDate: '2099-02-01',
  endDate: '2099-02-05',
  dailyPrice: 45.99,
};

const mockReservation: ReservationResponseDto = {
  id: 123,
  startDate: '2024-02-01',
  endDate: '2024-02-05',
  status: 'CONFIRMED',
  totalPrice: 183.96,
  currency: 'USD',
  customer: mockCustomer,
  car: mockCarDetails,
  durationDays: 4,
  dailyRate: 45.99,
};

const defaultBookingFlowState = {
  currentStep: 'review' as const,
  carDetails: mockCarDetails,
  bookingDetails: mockBookingDetails,
  customer: mockCustomer,
  totalDays: 4,
  totalCost: 183.96,
  reservation: null,
  isSubmitting: false,
  submissionError: null,
  initializeBooking: vi.fn(),
  setCustomer: vi.fn(),
  calculateCost: vi.fn(),
  nextStep: vi.fn(),
  previousStep: vi.fn(),
  setReservation: vi.fn(),
  setSubmitting: vi.fn(),
  setSubmissionError: vi.fn(),
  reset: vi.fn(),
  canProceedToReview: vi.fn(() => true),
  canSubmitBooking: vi.fn(() => true),
  isStepComplete: vi.fn(),
  getStepNumber: vi.fn(),
  initializeFromUrlParams: vi.fn(),
};

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('BookingReview', () => {
  const mockOnBack = vi.fn();
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseBookingFlow.mockReturnValue(defaultBookingFlowState);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders booking review with all details', () => {
      renderWithQueryClient(
        <BookingReview onBack={mockOnBack} onSubmit={mockOnSubmit} />
      );

      // Check main heading
      expect(screen.getByText('Review Your Booking')).toBeInTheDocument();
      expect(screen.getByText('Please review all details before confirming your reservation.')).toBeInTheDocument();

      // Check customer information
      expect(screen.getByText('Customer Information')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
      expect(screen.getByText('+1234567890')).toBeInTheDocument();
      expect(screen.getByText('DL123456789')).toBeInTheDocument();

      // Check vehicle information
      expect(screen.getByText('Vehicle Information')).toBeInTheDocument();
      expect(screen.getByText('Toyota Camry 2024')).toBeInTheDocument();
      expect(screen.getByText('INTERMEDIATE')).toBeInTheDocument();
      expect(screen.getAllByText('Downtown Branch').length).toBeGreaterThan(0);

      // Check rental period
      expect(screen.getByText('Rental Period')).toBeInTheDocument();
      expect(screen.getByText('4 days')).toBeInTheDocument();

      // Check cost summary
      expect(screen.getByText('Cost Summary')).toBeInTheDocument();
      expect(screen.getByText('$183.96')).toBeInTheDocument();
    });

    it('renders action buttons', () => {
      renderWithQueryClient(
        <BookingReview onBack={mockOnBack} onSubmit={mockOnSubmit} />
      );

      expect(screen.getByText('Back to Customer Selection')).toBeInTheDocument();
      expect(screen.getByText('Confirm Booking')).toBeInTheDocument();
    });

    it('shows loading state when missing booking information', () => {
      mockUseBookingFlow.mockReturnValue({
        ...defaultBookingFlowState,
        customer: null,
      });

      renderWithQueryClient(
        <BookingReview onBack={mockOnBack} onSubmit={mockOnSubmit} />
      );

      expect(screen.getByText('Missing booking information. Please go back and complete all steps.')).toBeInTheDocument();
      expect(screen.getByText('Go Back')).toBeInTheDocument();
    });
  });

  describe('Cost Calculation', () => {
    it('displays correct cost calculation', () => {
      renderWithQueryClient(
        <BookingReview onBack={mockOnBack} onSubmit={mockOnSubmit} />
      );

      // Check daily rate display
      expect(screen.getAllByText('$45.99').length).toBeGreaterThan(0);

      // Check number of days
      expect(screen.getByText('4')).toBeInTheDocument();

      // Check total cost
      expect(screen.getByText('$183.96')).toBeInTheDocument();
    });

    it('handles single day rental correctly', () => {
      mockUseBookingFlow.mockReturnValue({
        ...defaultBookingFlowState,
        totalDays: 1,
        totalCost: 45.99,
        bookingDetails: {
          ...mockBookingDetails,
          endDate: '2099-02-01',
        },
      });

      renderWithQueryClient(
        <BookingReview onBack={mockOnBack} onSubmit={mockOnSubmit} />
      );

      expect(screen.getByText('1 day')).toBeInTheDocument();
      expect(screen.getAllByText('$45.99').length).toBeGreaterThan(0);
    });
  });

  describe('Form Validation', () => {
    it('validates required fields before submission', async () => {
      mockUseBookingFlow.mockReturnValue({
        ...defaultBookingFlowState,
        customer: null,
      });

      renderWithQueryClient(
        <BookingReview onBack={mockOnBack} onSubmit={mockOnSubmit} />
      );

      const confirmButton = screen.getByText('Go Back');
      fireEvent.click(confirmButton);

      expect(mockOnBack).toHaveBeenCalled();
    });

    it('validates date ranges', async () => {
      // Mock past date
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      mockUseBookingFlow.mockReturnValue({
        ...defaultBookingFlowState,
        bookingDetails: {
          ...mockBookingDetails,
          startDate: pastDate.toISOString().split('T')[0],
        },
      });

      render(
        <QueryClientProvider client={queryClient}>
          <BookingReview onBack={mockOnBack} onSubmit={mockOnSubmit} />
        </QueryClientProvider>
      );

      const confirmButton = screen.getByText('Confirm Booking');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/Pickup date cannot be in the past/)).toBeInTheDocument();
      });
    });

    it('validates end date is after start date', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      mockUseBookingFlow.mockReturnValue({
        ...defaultBookingFlowState,
        bookingDetails: {
          ...mockBookingDetails,
          startDate: '2024-02-05',
          endDate: '2024-02-01',
        },
      });

      render(
        <QueryClientProvider client={queryClient}>
          <BookingReview onBack={mockOnBack} onSubmit={mockOnSubmit} />
        </QueryClientProvider>
      );

      const confirmButton = screen.getByText('Confirm Booking');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/Return date must be after pickup date/)).toBeInTheDocument();
      });
    });

    it('validates total cost is positive', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      mockUseBookingFlow.mockReturnValue({
        ...defaultBookingFlowState,
        totalCost: 0,
      });

      render(
        <QueryClientProvider client={queryClient}>
          <BookingReview onBack={mockOnBack} onSubmit={mockOnSubmit} />
        </QueryClientProvider>
      );

      const confirmButton = screen.getByText('Confirm Booking');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/Invalid total cost calculation/)).toBeInTheDocument();
      });
    });
  });

  describe('Booking Submission', () => {
    it('submits booking with correct data', async () => {
      mockCreateReservation.mockResolvedValue(mockReservation);

      renderWithQueryClient(
        <BookingReview onBack={mockOnBack} onSubmit={mockOnSubmit} />
      );

      const confirmButton = screen.getByText('Confirm Booking');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockCreateReservation).toHaveBeenCalledWith({
          customerId: 1,
          carId: 1,
          startDate: '2099-02-01',
          endDate: '2099-02-05',
          pickupBranchId: 1,
          dropoffBranchId: 1,
          notes: '',
        });
      });

      expect(defaultBookingFlowState.setReservation).toHaveBeenCalledWith(mockReservation);
      expect(mockOnSubmit).toHaveBeenCalled();
    });

    it('calls createReservation when form is valid', async () => {
      mockCreateReservation.mockResolvedValue(mockReservation);

      renderWithQueryClient(
        <BookingReview onBack={mockOnBack} onSubmit={mockOnSubmit} />
      );

      const confirmButton = screen.getByText('Confirm Booking');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockCreateReservation).toHaveBeenCalled();
      });
    });
  });

  describe('Navigation', () => {
    it('calls onBack when back button is clicked', () => {
      renderWithQueryClient(
        <BookingReview onBack={mockOnBack} onSubmit={mockOnSubmit} />
      );

      const backButton = screen.getByText('Back to Customer Selection');
      fireEvent.click(backButton);

      expect(mockOnBack).toHaveBeenCalled();
    });
  });

  describe('Date Formatting', () => {
    it('formats dates correctly', () => {
      renderWithQueryClient(
        <BookingReview onBack={mockOnBack} onSubmit={mockOnSubmit} />
      );

      // Check that dates are formatted in a readable way
      expect(screen.getByText(/Sunday, February 1, 2099/)).toBeInTheDocument();
      expect(screen.getByText(/Thursday, February 5, 2099/)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('clears validation errors on successful submission', async () => {
      // First show validation error
      const queryClient1 = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      mockUseBookingFlow.mockReturnValue({
        ...defaultBookingFlowState,
        totalCost: 0,
      });

      const { rerender } = render(
        <QueryClientProvider client={queryClient1}>
          <BookingReview onBack={mockOnBack} onSubmit={mockOnSubmit} />
        </QueryClientProvider>
      );

      const confirmButton = screen.getByText('Confirm Booking');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/Invalid total cost calculation/)).toBeInTheDocument();
      });

      // Then fix the data and rerender
      mockUseBookingFlow.mockReturnValue(defaultBookingFlowState);
      mockCreateReservation.mockResolvedValue(mockReservation);

      const queryClient2 = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      rerender(
        <QueryClientProvider client={queryClient2}>
          <BookingReview onBack={mockOnBack} onSubmit={mockOnSubmit} />
        </QueryClientProvider>
      );

      const newConfirmButton = screen.getByText('Confirm Booking');
      fireEvent.click(newConfirmButton);

      await waitFor(() => {
        expect(screen.queryByText(/Invalid total cost calculation/)).not.toBeInTheDocument();
      });
    });
  });
});