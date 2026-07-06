import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BookingWizard from '../BookingWizard';
import { useBookingFlowStore } from '@/stores/useBookingFlowStore';

// Mock the API queries
vi.mock('@/lib/api/queries', () => ({
  createReservation: vi.fn(),
  listCustomers: vi.fn().mockResolvedValue({
    content: [],
    totalElements: 0,
    totalPages: 0,
    size: 10,
    number: 0,
  }),
}));

// Mock the navigate function
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function TestProviders({ 
  children, 
  initialEntries = ['/book'] 
}: { 
  children: React.ReactNode;
  initialEntries?: string[];
}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('BookingWizard', () => {
  beforeEach(() => {
    // Reset store state and mocks before each test
    useBookingFlowStore.getState().reset();
    mockNavigate.mockClear();
  });

  describe('URL parameter initialization', () => {
    it('should show error when no URL parameters are provided', async () => {
      render(
        <TestProviders initialEntries={['/book']}>
          <BookingWizard />
        </TestProviders>
      );

      await waitFor(() => {
        expect(screen.getByText('Unable to Load Booking')).toBeInTheDocument();
        expect(screen.getByText(/Missing required booking parameters/)).toBeInTheDocument();
      });
    });

    it('should show error when incomplete URL parameters are provided', async () => {
      render(
        <TestProviders initialEntries={['/book?carId=1&branchId=2']}>
          <BookingWizard />
        </TestProviders>
      );

      await waitFor(() => {
        expect(screen.getByText('Unable to Load Booking')).toBeInTheDocument();
        expect(screen.getByText(/Missing required booking parameters/)).toBeInTheDocument();
      });
    });

    it('should initialize booking when all required URL parameters are provided', async () => {
      const urlParams = '?carId=1&branchId=2&startDate=2099-01-01&endDate=2099-01-05&dailyPrice=50&carDisplayName=Toyota%20Camry&carCategory=INTERMEDIATE&branchName=Downtown';
      
      render(
        <TestProviders initialEntries={[`/book${urlParams}`]}>
          <BookingWizard />
        </TestProviders>
      );

      await waitFor(() => {
        expect(screen.getByText('Book Your Rental')).toBeInTheDocument();
      });

      // Should not show error when parameters are valid
      expect(screen.queryByText('Unable to Load Booking')).not.toBeInTheDocument();
      
      // Check if booking summary is displayed with correct data
      expect(screen.getByText('Toyota Camry')).toBeInTheDocument();
      expect(screen.getByText('2099-01-01')).toBeInTheDocument();
      expect(screen.getByText('2099-01-05')).toBeInTheDocument();
      expect(screen.getByText('4 days')).toBeInTheDocument();
      expect(screen.getByText('$200.00')).toBeInTheDocument();
    });

    it('should handle URL-encoded parameters correctly', async () => {
      const urlParams = '?carId=1&branchId=2&startDate=2099-01-01&endDate=2099-01-05&dailyPrice=75.50&carDisplayName=Honda%20Civic%20Hybrid&carCategory=COMPACT&branchName=Airport%20Terminal%201';
      
      render(
        <TestProviders initialEntries={[`/book${urlParams}`]}>
          <BookingWizard />
        </TestProviders>
      );

      await waitFor(() => {
        expect(screen.getByText('Honda Civic Hybrid')).toBeInTheDocument();
        expect(screen.getByText('$302.00')).toBeInTheDocument(); // 4 days * 75.50
      });
    });

    it('should provide retry functionality for failed initialization', async () => {
      render(
        <TestProviders initialEntries={['/book']}>
          <BookingWizard />
        </TestProviders>
      );

      await waitFor(() => {
        expect(screen.getByText('Unable to Load Booking')).toBeInTheDocument();
      });

      const retryButton = screen.getByText(/Retry \(3 attempts left\)/);
      expect(retryButton).toBeInTheDocument();

      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText(/Retry \(2 attempts left\)/)).toBeInTheDocument();
      });
    });

    it('should provide navigation to availability search', async () => {
      render(
        <TestProviders initialEntries={['/book']}>
          <BookingWizard />
        </TestProviders>
      );

      await waitFor(() => {
        expect(screen.getByText('Start New Search')).toBeInTheDocument();
      });

      const newSearchButton = screen.getByText('Start New Search');
      fireEvent.click(newSearchButton);

      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  describe('step navigation UI', () => {
    const validUrlParams = '?carId=1&branchId=2&startDate=2099-01-01&endDate=2099-01-05&dailyPrice=50&carDisplayName=Toyota%20Camry';

    it('should display correct step indicators', async () => {
      render(
        <TestProviders initialEntries={[`/book${validUrlParams}`]}>
          <BookingWizard />
        </TestProviders>
      );

      await waitFor(() => {
        expect(screen.getByText('1. Customer Selection')).toBeInTheDocument();
        expect(screen.getByText('2. Review & Confirm')).toBeInTheDocument();
        expect(screen.getByText('3. Confirmation')).toBeInTheDocument();
      });

      // Customer step should be active (blue background)
      const customerStep = screen.getByText('1. Customer Selection');
      expect(customerStep).toHaveClass('bg-blue-100', 'text-blue-800');
    });

    it('should show customer selection step content initially', async () => {
      render(
        <TestProviders initialEntries={[`/book${validUrlParams}`]}>
          <BookingWizard />
        </TestProviders>
      );

      await waitFor(() => {
        expect(screen.getByText('Select Customer')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Search by name, email, phone, or license number...')).toBeInTheDocument();
      });
    });

    it('should show an error for incomplete URL parameters', async () => {
      render(
        <TestProviders initialEntries={['/book?carId=1']}>
          <BookingWizard />
        </TestProviders>
      );

      // The initialization effect runs synchronously (no async work), so by
      // the time render() returns there's no observable intermediate loading
      // state here -- it goes straight to the missing-params error.
      await waitFor(() => {
        expect(screen.getByText(/Missing required booking parameters/)).toBeInTheDocument();
      });
    });
  });

  describe('booking summary display', () => {
    const validUrlParams = '?carId=1&branchId=2&startDate=2099-01-01&endDate=2099-01-05&dailyPrice=50&carDisplayName=Toyota%20Camry&branchName=Downtown%20Branch';

    it('should display booking summary with correct information', async () => {
      render(
        <TestProviders initialEntries={[`/book${validUrlParams}`]}>
          <BookingWizard />
        </TestProviders>
      );

      await waitFor(() => {
        expect(screen.getByText('Booking Summary')).toBeInTheDocument();
        expect(screen.getByText('Toyota Camry')).toBeInTheDocument();
        expect(screen.getByText('2099-01-01')).toBeInTheDocument();
        expect(screen.getByText('2099-01-05')).toBeInTheDocument();
        expect(screen.getByText('4 days')).toBeInTheDocument();
        expect(screen.getByText('$200.00')).toBeInTheDocument();
      });
    });

    it('should update summary when store state changes', async () => {
      render(
        <TestProviders initialEntries={[`/book${validUrlParams}`]}>
          <BookingWizard />
        </TestProviders>
      );

      await waitFor(() => {
        expect(screen.getByText('$200.00')).toBeInTheDocument();
      });

      // Simulate store state change (this would normally happen through user interaction)
      await act(async () => {
        const store = useBookingFlowStore.getState();
        store.initializeBooking({
          carDetails: {
            id: 1,
            displayName: 'Updated Car',
            category: 'LUXURY',
            dailyPrice: 100,
            branchName: 'Downtown Branch',
          },
          bookingDetails: {
            carId: 1,
            branchId: 2,
            startDate: '2099-01-01',
            endDate: '2099-01-03',
            dailyPrice: 100,
          },
        });
      });

      await waitFor(() => {
        expect(screen.getByText('Updated Car')).toBeInTheDocument();
        expect(screen.getByText('2 days')).toBeInTheDocument();
        expect(screen.getByText('$200.00')).toBeInTheDocument(); // 2 days * 100
      });
    });
  });

  describe('navigation handlers', () => {
    const validUrlParams = '?carId=1&branchId=2&startDate=2099-01-01&endDate=2099-01-05&dailyPrice=50&carDisplayName=Toyota%20Camry';

    it('should handle cancel navigation and reset store', async () => {
      render(
        <TestProviders initialEntries={[`/book${validUrlParams}`]}>
          <BookingWizard />
        </TestProviders>
      );

      await waitFor(() => {
        expect(screen.getByText('Back')).toBeInTheDocument();
      });

      // Verify store has data before cancel
      const storeBefore = useBookingFlowStore.getState();
      expect(storeBefore.carDetails).not.toBeNull();

      // vi.spyOn on a getState() snapshot won't intercept future calls --
      // Zustand replaces the state object on every set(), so the component
      // reads the reset function from a later, un-spied snapshot. Inject the
      // spy via setState instead, so it becomes part of the live store.
      const resetSpy = vi.fn(useBookingFlowStore.getState().reset);
      await act(async () => {
        useBookingFlowStore.setState({ reset: resetSpy });
      });

      const cancelButton = screen.getByText('Back');

      await act(async () => {
        fireEvent.click(cancelButton);
      });

      // The cancel handler resets the store and navigates home. Because
      // useNavigate is mocked as a no-op here, the route never actually
      // changes, so the wizard's own init effect re-fires (bookingDetails
      // went null) and repopulates the store from the still-present URL
      // params -- unlike the real app, where navigating away unmounts this
      // component. So we assert the reset/navigate calls themselves rather
      // than the post-click store snapshot.
      expect(resetSpy).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('should handle step navigation through booking flow', async () => {
      render(
        <TestProviders initialEntries={[`/book${validUrlParams}`]}>
          <BookingWizard />
        </TestProviders>
      );

      await waitFor(() => {
        expect(screen.getByText('Book Your Rental')).toBeInTheDocument();
      });

      // Start at customer step
      expect(useBookingFlowStore.getState().currentStep).toBe('customer');

      // Simulate customer selection and navigation to review
      await act(async () => {
        const store = useBookingFlowStore.getState();
        store.setCustomer({
          id: 1,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          driverLicenseNo: 'DL123456',
          city: 'New York',
          country: 'US',
        });
        store.nextStep();
      });

      await waitFor(() => {
        expect(screen.getByText('Review Your Booking')).toBeInTheDocument();
        expect(useBookingFlowStore.getState().currentStep).toBe('review');
      });
    });
  });

  describe('error handling', () => {
    it('should handle initialization errors gracefully', async () => {
      // Mock console.error to avoid noise in test output
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock the initializeFromUrlParams to throw an error
      const originalInitialize = useBookingFlowStore.getState().initializeBooking;
      
      await act(async () => {
        useBookingFlowStore.setState({
          initializeBooking: vi.fn(() => {
            throw new Error('Test initialization error');
          })
        });
      });

      render(
        <TestProviders initialEntries={['/book?carId=1&branchId=2&startDate=2099-01-01&endDate=2099-01-05&dailyPrice=50']}>
          <BookingWizard />
        </TestProviders>
      );

      await waitFor(() => {
        // useBookingFlow's initializeFromUrlParams catches the thrown error
        // internally and returns false; BookingWizard then reports it as a
        // normal "failed to initialize" outcome, not its own catch-block message.
        expect(screen.getByText('Failed to initialize booking. Please start from the availability search.')).toBeInTheDocument();
      });

      // Restore original function
      await act(async () => {
        useBookingFlowStore.setState({ initializeBooking: originalInitialize });
      });
      consoleSpy.mockRestore();
    });

    it('should show skeleton loading state', async () => {
      // With valid URL params, initialization completes synchronously within
      // render()'s act() scope, so the loading UI is never observable that
      // way. Instead, force the exact state the loading branch checks for:
      // bookingDetails already set (so the URL-param init effect skips) but
      // carDetails still null.
      await act(async () => {
        useBookingFlowStore.setState({
          bookingDetails: {
            carId: 1,
            branchId: 2,
            startDate: '2099-01-01',
            endDate: '2099-01-05',
            dailyPrice: 50,
          },
          carDetails: null,
        });
      });

      render(
        <TestProviders initialEntries={['/book?carId=1&branchId=2&startDate=2099-01-01&endDate=2099-01-05&dailyPrice=50']}>
          <BookingWizard />
        </TestProviders>
      );

      expect(screen.getByText('Loading booking details...')).toBeInTheDocument();
      // Check for skeleton loading elements
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
    });
  });

  describe('booking submission integration', () => {
    const validUrlParams = '?carId=1&branchId=2&startDate=2099-01-01&endDate=2099-01-05&dailyPrice=50&carDisplayName=Toyota%20Camry';

    it('should handle successful booking submission', async () => {
      render(
        <TestProviders initialEntries={[`/book${validUrlParams}`]}>
          <BookingWizard />
        </TestProviders>
      );

      await waitFor(() => {
        expect(screen.getByText('Book Your Rental')).toBeInTheDocument();
      });

      // Navigate to review step with customer selected
      await act(async () => {
        const store = useBookingFlowStore.getState();
        store.setCustomer({
          id: 1,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          driverLicenseNo: 'DL123456',
          city: 'New York',
          country: 'US',
        });
        store.nextStep();
      });

      await waitFor(() => {
        expect(screen.getByText('Review Your Booking')).toBeInTheDocument();
      });

      // Verify booking submission button is present
      expect(screen.getByText('Confirm Booking')).toBeInTheDocument();
    });

    it('should show loading states during submission', async () => {
      render(
        <TestProviders initialEntries={[`/book${validUrlParams}`]}>
          <BookingWizard />
        </TestProviders>
      );

      await waitFor(() => {
        expect(screen.getByText('Book Your Rental')).toBeInTheDocument();
      });

      // Test that submission loading states are handled by the store
      await act(async () => {
        const store = useBookingFlowStore.getState();
        store.setSubmitting(true);
      });

      const store = useBookingFlowStore.getState();
      expect(store.isSubmitting).toBe(true);
    });
  });
});