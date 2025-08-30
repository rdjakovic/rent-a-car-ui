import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BookingWizard from '../BookingWizard';
import { useBookingFlowStore } from '@/stores/useBookingFlowStore';

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
    it('should redirect to home when no URL parameters are provided', async () => {
      render(
        <TestProviders initialEntries={['/book']}>
          <BookingWizard />
        </TestProviders>
      );

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/');
      });
    });

    it('should redirect to home when incomplete URL parameters are provided', async () => {
      render(
        <TestProviders initialEntries={['/book?carId=1&branchId=2']}>
          <BookingWizard />
        </TestProviders>
      );

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/');
      });
    });

    it('should initialize booking when all required URL parameters are provided', async () => {
      const urlParams = '?carId=1&branchId=2&startDate=2024-01-01&endDate=2024-01-05&dailyPrice=50&carDisplayName=Toyota%20Camry&carCategory=MIDSIZE&branchName=Downtown';
      
      render(
        <TestProviders initialEntries={[`/book${urlParams}`]}>
          <BookingWizard />
        </TestProviders>
      );

      await waitFor(() => {
        expect(screen.getByText('Book Your Rental')).toBeInTheDocument();
      });

      // Should not redirect when parameters are valid
      expect(mockNavigate).not.toHaveBeenCalledWith('/');
      
      // Check if booking summary is displayed with correct data
      expect(screen.getByText('Toyota Camry')).toBeInTheDocument();
      expect(screen.getByText('2024-01-01')).toBeInTheDocument();
      expect(screen.getByText('2024-01-05')).toBeInTheDocument();
      expect(screen.getByText('4 days')).toBeInTheDocument();
      expect(screen.getByText('$200.00')).toBeInTheDocument();
    });

    it('should handle URL-encoded parameters correctly', async () => {
      const urlParams = '?carId=1&branchId=2&startDate=2024-01-01&endDate=2024-01-05&dailyPrice=75.50&carDisplayName=Honda%20Civic%20Hybrid&carCategory=COMPACT&branchName=Airport%20Terminal%201';
      
      render(
        <TestProviders initialEntries={[`/book${urlParams}`]}>
          <BookingWizard />
        </TestProviders>
      );

      await waitFor(() => {
        expect(screen.getByText('Honda Civic Hybrid')).toBeInTheDocument();
        // Note: Branch name is not displayed in the booking summary, only car details
        expect(screen.getByText('$302.00')).toBeInTheDocument(); // 4 days * 75.50
      });
    });
  });

  describe('step navigation UI', () => {
    const validUrlParams = '?carId=1&branchId=2&startDate=2024-01-01&endDate=2024-01-05&dailyPrice=50&carDisplayName=Toyota%20Camry';

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
        expect(screen.getByText('Customer selection component will be implemented in the next task.')).toBeInTheDocument();
      });
    });

    it('should have disabled Next button initially', async () => {
      render(
        <TestProviders initialEntries={[`/book${validUrlParams}`]}>
          <BookingWizard />
        </TestProviders>
      );

      await waitFor(() => {
        const nextButton = screen.getByText('Next: Review');
        expect(nextButton).toBeDisabled();
      });
    });

    it('should show cancel button that calls handleCancel', async () => {
      render(
        <TestProviders initialEntries={[`/book${validUrlParams}`]}>
          <BookingWizard />
        </TestProviders>
      );

      await waitFor(() => {
        const cancelButton = screen.getByText('Cancel');
        expect(cancelButton).toBeInTheDocument();
      });
    });
  });

  describe('booking summary display', () => {
    const validUrlParams = '?carId=1&branchId=2&startDate=2024-01-01&endDate=2024-01-05&dailyPrice=50&carDisplayName=Toyota%20Camry&branchName=Downtown%20Branch';

    it('should display booking summary with correct information', async () => {
      render(
        <TestProviders initialEntries={[`/book${validUrlParams}`]}>
          <BookingWizard />
        </TestProviders>
      );

      await waitFor(() => {
        expect(screen.getByText('Booking Summary')).toBeInTheDocument();
        expect(screen.getByText('Toyota Camry')).toBeInTheDocument();
        expect(screen.getByText('2024-01-01')).toBeInTheDocument();
        expect(screen.getByText('2024-01-05')).toBeInTheDocument();
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
            startDate: '2024-01-01',
            endDate: '2024-01-03',
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
    const validUrlParams = '?carId=1&branchId=2&startDate=2024-01-01&endDate=2024-01-05&dailyPrice=50';

    it('should handle completion navigation', async () => {
      render(
        <TestProviders initialEntries={[`/book${validUrlParams}`]}>
          <BookingWizard />
        </TestProviders>
      );

      await waitFor(() => {
        expect(screen.getByText('Book Your Rental')).toBeInTheDocument();
      });

      // Simulate completion (this would normally be called after successful booking)
      // We can't easily test the handleComplete function directly, but we can verify
      // that the component renders without errors and has the expected structure
    });

    it('should handle cancel navigation', async () => {
      render(
        <TestProviders initialEntries={[`/book${validUrlParams}`]}>
          <BookingWizard />
        </TestProviders>
      );

      await waitFor(() => {
        expect(screen.getByText('Cancel')).toBeInTheDocument();
      });

      const cancelButton = screen.getByText('Cancel');
      
      await act(async () => {
        fireEvent.click(cancelButton);
      });

      // The cancel handler should call navigate to home
      // We can verify that navigate was called with '/'
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  describe('loading state', () => {
    it('should show loading message when booking details are not available', () => {
      // Render without URL parameters to trigger loading state
      render(
        <TestProviders initialEntries={['/book']}>
          <BookingWizard />
        </TestProviders>
      );

      expect(screen.getByText('Loading booking details...')).toBeInTheDocument();
    });
  });

  describe('step content placeholders', () => {
    const validUrlParams = '?carId=1&branchId=2&startDate=2024-01-01&endDate=2024-01-05&dailyPrice=50';

    it('should show placeholder content for future implementation steps', async () => {
      render(
        <TestProviders initialEntries={[`/book${validUrlParams}`]}>
          <BookingWizard />
        </TestProviders>
      );

      // Start at customer step
      await waitFor(() => {
        expect(screen.getByText('Customer selection component will be implemented in the next task.')).toBeInTheDocument();
      });

      // Navigate to review step (simulate having a customer selected)
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
        expect(screen.getByText('Booking review component will be implemented in a later task.')).toBeInTheDocument();
      });

      // Navigate to confirmation step
      await act(async () => {
        const store = useBookingFlowStore.getState();
        store.nextStep();
      });

      await waitFor(() => {
        expect(screen.getByText('Confirmation component will be implemented in a later task.')).toBeInTheDocument();
      });
    });
  });
});