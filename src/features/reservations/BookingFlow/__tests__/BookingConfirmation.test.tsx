import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import BookingConfirmation from '../BookingConfirmation';
import { useBookingFlow } from '@/hooks/useBookingFlow';
import type { ReservationResponseDto, CustomerResponseDto, CarListResponseDto } from '@/lib/api/queries';

// Mock the hooks and navigation
vi.mock('@/hooks/useBookingFlow');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

const mockUseBookingFlow = vi.mocked(useBookingFlow);
const mockNavigate = vi.fn();

// Mock window.open for print functionality
Object.defineProperty(window, 'open', {
  writable: true,
  value: vi.fn(() => ({
    document: {
      write: vi.fn(),
      close: vi.fn(),
    },
    print: vi.fn(),
  })),
});

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
  licenseExpiryDate: '2025-12-31',
};

const mockCarDetails: CarListResponseDto = {
  id: 1,
  displayName: 'Toyota Camry 2024',
  category: 'MIDSIZE',
  dailyPrice: 45.99,
  branchName: 'Downtown Branch',
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
  pickupBranch: { id: 1, name: 'Downtown Branch', address: '123 Main St', city: 'New York', country: 'USA' },
  dropoffBranch: { id: 1, name: 'Downtown Branch', address: '123 Main St', city: 'New York', country: 'USA' },
  durationDays: 4,
  dailyRate: 45.99,
  notes: '',
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z',
};

const defaultBookingFlowState = {
  currentStep: 'confirmation' as const,
  carDetails: mockCarDetails,
  bookingDetails: {
    carId: 1,
    branchId: 1,
    startDate: '2024-02-01',
    endDate: '2024-02-05',
    dailyPrice: 45.99,
  },
  customer: mockCustomer,
  totalDays: 4,
  totalCost: 183.96,
  reservation: mockReservation,
  initializeBooking: vi.fn(),
  setCustomer: vi.fn(),
  calculateCost: vi.fn(),
  nextStep: vi.fn(),
  previousStep: vi.fn(),
  setReservation: vi.fn(),
  reset: vi.fn(),
  canProceedToReview: vi.fn(() => true),
  canSubmitBooking: vi.fn(() => true),
  isStepComplete: vi.fn(),
  getStepNumber: vi.fn(),
  initializeFromUrlParams: vi.fn(),
};

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

// Mock useNavigate
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('BookingConfirmation', () => {
  const mockOnNewBooking = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseBookingFlow.mockReturnValue(defaultBookingFlowState);
  });

  describe('Component Rendering', () => {
    it('renders confirmation screen with success message', () => {
      renderWithRouter(
        <BookingConfirmation onNewBooking={mockOnNewBooking} />
      );

      expect(screen.getByText('Booking Confirmed!')).toBeInTheDocument();
      expect(screen.getByText('Your reservation has been successfully created.')).toBeInTheDocument();
      expect(screen.getByText('#123')).toBeInTheDocument();
      expect(screen.getByText('CONFIRMED')).toBeInTheDocument();
    });

    it('renders all reservation details', () => {
      renderWithRouter(
        <BookingConfirmation onNewBooking={mockOnNewBooking} />
      );

      // Customer information
      expect(screen.getByText('Customer Information')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
      expect(screen.getByText('+1234567890')).toBeInTheDocument();
      expect(screen.getByText('DL123456789')).toBeInTheDocument();

      // Vehicle information
      expect(screen.getByText('Vehicle Information')).toBeInTheDocument();
      expect(screen.getByText('Toyota Camry 2024')).toBeInTheDocument();
      expect(screen.getByText('MIDSIZE')).toBeInTheDocument();

      // Rental period
      expect(screen.getByText('Rental Period')).toBeInTheDocument();
      expect(screen.getByText('4 days')).toBeInTheDocument();

      // Location information
      expect(screen.getByText('Pickup & Return Location')).toBeInTheDocument();
      expect(screen.getAllByText('Downtown Branch')).toHaveLength(2);

      // Cost summary
      expect(screen.getByText('Final Cost Summary')).toBeInTheDocument();
      expect(screen.getByText('$183.96')).toBeInTheDocument();
      expect(screen.getByText('Currency: USD')).toBeInTheDocument();
    });

    it('renders action buttons', () => {
      renderWithRouter(
        <BookingConfirmation onNewBooking={mockOnNewBooking} />
      );

      expect(screen.getByText('Print Confirmation')).toBeInTheDocument();
      expect(screen.getByText('New Booking')).toBeInTheDocument();
      expect(screen.getByText('View All Reservations')).toBeInTheDocument();
      expect(screen.getByText('New Availability Search')).toBeInTheDocument();
      expect(screen.getByText('Create Another Booking')).toBeInTheDocument();
      expect(screen.getByText('Manage Reservations')).toBeInTheDocument();
    });

    it('renders important information section', () => {
      renderWithRouter(
        <BookingConfirmation onNewBooking={mockOnNewBooking} />
      );

      expect(screen.getByText('Important Information')).toBeInTheDocument();
      expect(screen.getByText('Before Pickup:')).toBeInTheDocument();
      expect(screen.getByText('During Rental:')).toBeInTheDocument();
      expect(screen.getByText('Need Changes?')).toBeInTheDocument();
      
      expect(screen.getByText(/Bring a valid driver's license and credit card/)).toBeInTheDocument();
      expect(screen.getByText(/Arrive at least 15 minutes before/)).toBeInTheDocument();
      expect(screen.getByText(/Contact us at least 24 hours in advance/)).toBeInTheDocument();
    });

    it('shows fallback when no reservation exists', () => {
      mockUseBookingFlow.mockReturnValue({
        ...defaultBookingFlowState,
        reservation: null,
      });

      renderWithRouter(
        <BookingConfirmation onNewBooking={mockOnNewBooking} />
      );

      expect(screen.getByText('No reservation found. Please complete the booking process.')).toBeInTheDocument();
      expect(screen.getByText('Start New Booking')).toBeInTheDocument();
    });
  });

  describe('Status Badge Variants', () => {
    it('renders correct badge variant for CONFIRMED status', () => {
      renderWithRouter(
        <BookingConfirmation onNewBooking={mockOnNewBooking} />
      );

      const badge = screen.getByText('CONFIRMED');
      expect(badge).toBeInTheDocument();
    });

    it('renders correct badge variant for PENDING status', () => {
      mockUseBookingFlow.mockReturnValue({
        ...defaultBookingFlowState,
        reservation: {
          ...mockReservation,
          status: 'PENDING',
        },
      });

      renderWithRouter(
        <BookingConfirmation onNewBooking={mockOnNewBooking} />
      );

      const badge = screen.getByText('PENDING');
      expect(badge).toBeInTheDocument();
    });

    it('renders correct badge variant for CANCELLED status', () => {
      mockUseBookingFlow.mockReturnValue({
        ...defaultBookingFlowState,
        reservation: {
          ...mockReservation,
          status: 'CANCELLED',
        },
      });

      renderWithRouter(
        <BookingConfirmation onNewBooking={mockOnNewBooking} />
      );

      const badge = screen.getByText('CANCELLED');
      expect(badge).toBeInTheDocument();
    });

    it('renders correct badge variant for COMPLETED status', () => {
      mockUseBookingFlow.mockReturnValue({
        ...defaultBookingFlowState,
        reservation: {
          ...mockReservation,
          status: 'COMPLETED',
        },
      });

      renderWithRouter(
        <BookingConfirmation onNewBooking={mockOnNewBooking} />
      );

      const badge = screen.getByText('COMPLETED');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Date Formatting', () => {
    it('formats dates correctly', () => {
      renderWithRouter(
        <BookingConfirmation onNewBooking={mockOnNewBooking} />
      );

      expect(screen.getByText(/Thursday, February 1, 2024/)).toBeInTheDocument();
      expect(screen.getByText(/Monday, February 5, 2024/)).toBeInTheDocument();
    });

    it('handles single day rental correctly', () => {
      mockUseBookingFlow.mockReturnValue({
        ...defaultBookingFlowState,
        reservation: {
          ...mockReservation,
          durationDays: 1,
        },
      });

      renderWithRouter(
        <BookingConfirmation onNewBooking={mockOnNewBooking} />
      );

      expect(screen.getByText('1 day')).toBeInTheDocument();
    });

    it('handles multiple day rental correctly', () => {
      renderWithRouter(
        <BookingConfirmation onNewBooking={mockOnNewBooking} />
      );

      expect(screen.getByText('4 days')).toBeInTheDocument();
    });
  });

  describe('Print Functionality', () => {
    it('opens print window when print button is clicked', () => {
      const mockPrintWindow = {
        document: {
          write: vi.fn(),
          close: vi.fn(),
        },
        print: vi.fn(),
      };
      
      vi.mocked(window.open).mockReturnValue(mockPrintWindow as any);

      renderWithRouter(
        <BookingConfirmation onNewBooking={mockOnNewBooking} />
      );

      const printButton = screen.getByText('Print Confirmation');
      fireEvent.click(printButton);

      expect(window.open).toHaveBeenCalledWith('', '_blank');
      expect(mockPrintWindow.document.write).toHaveBeenCalled();
      expect(mockPrintWindow.document.close).toHaveBeenCalled();
      expect(mockPrintWindow.print).toHaveBeenCalled();
    });

    it('handles print window not opening', () => {
      vi.mocked(window.open).mockReturnValue(null);

      renderWithRouter(
        <BookingConfirmation onNewBooking={mockOnNewBooking} />
      );

      const printButton = screen.getByText('Print Confirmation');
      
      // Should not throw error
      expect(() => fireEvent.click(printButton)).not.toThrow();
    });

    it('includes all reservation details in print content', () => {
      const mockPrintWindow = {
        document: {
          write: vi.fn(),
          close: vi.fn(),
        },
        print: vi.fn(),
      };
      
      vi.mocked(window.open).mockReturnValue(mockPrintWindow as any);

      renderWithRouter(
        <BookingConfirmation onNewBooking={mockOnNewBooking} />
      );

      const printButton = screen.getByText('Print Confirmation');
      fireEvent.click(printButton);

      const printContent = mockPrintWindow.document.write.mock.calls[0][0];
      
      // Check that important details are included in print content
      expect(printContent).toContain('Reservation #123');
      expect(printContent).toContain('John Doe');
      expect(printContent).toContain('Toyota Camry 2024');
      expect(printContent).toContain('$183.96');
      expect(printContent).toContain('CONFIRMED');
    });
  });

  describe('Navigation', () => {
    it('navigates to home when new search button is clicked', () => {
      renderWithRouter(
        <BookingConfirmation onNewBooking={mockOnNewBooking} />
      );

      const newSearchButton = screen.getByText('New Availability Search');
      fireEvent.click(newSearchButton);

      expect(defaultBookingFlowState.reset).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('navigates to reservations when view reservations button is clicked', () => {
      renderWithRouter(
        <BookingConfirmation onNewBooking={mockOnNewBooking} />
      );

      const viewReservationsButtons = screen.getAllByText(/View All Reservations|Manage Reservations/);
      fireEvent.click(viewReservationsButtons[0]);

      expect(mockNavigate).toHaveBeenCalledWith('/reservations');
    });

    it('calls onNewBooking when new booking button is clicked', () => {
      renderWithRouter(
        <BookingConfirmation onNewBooking={mockOnNewBooking} />
      );

      const newBookingButtons = screen.getAllByText(/New Booking|Create Another Booking/);
      fireEvent.click(newBookingButtons[0]);

      expect(mockOnNewBooking).toHaveBeenCalled();
    });

    it('navigates to home when start new booking is clicked (no reservation case)', () => {
      mockUseBookingFlow.mockReturnValue({
        ...defaultBookingFlowState,
        reservation: null,
      });

      renderWithRouter(
        <BookingConfirmation onNewBooking={mockOnNewBooking} />
      );

      const startNewBookingButton = screen.getByText('Start New Booking');
      fireEvent.click(startNewBookingButton);

      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  describe('Data Handling', () => {
    it('handles missing customer phone gracefully', () => {
      mockUseBookingFlow.mockReturnValue({
        ...defaultBookingFlowState,
        reservation: {
          ...mockReservation,
          customer: {
            ...mockCustomer,
            phone: undefined,
          },
        },
      });

      renderWithRouter(
        <BookingConfirmation onNewBooking={mockOnNewBooking} />
      );

      expect(screen.getByText('Not provided')).toBeInTheDocument();
    });

    it('handles missing currency gracefully', () => {
      mockUseBookingFlow.mockReturnValue({
        ...defaultBookingFlowState,
        reservation: {
          ...mockReservation,
          currency: undefined,
        },
      });

      renderWithRouter(
        <BookingConfirmation onNewBooking={mockOnNewBooking} />
      );

      expect(screen.getByText('Currency: USD')).toBeInTheDocument();
    });

    it('displays all cost information correctly', () => {
      renderWithRouter(
        <BookingConfirmation onNewBooking={mockOnNewBooking} />
      );

      // Check daily rate (there are multiple instances, so use getAllByText)
      expect(screen.getAllByText('$45.99')).toHaveLength(2);
      
      // Check number of days
      expect(screen.getByText('4')).toBeInTheDocument();
      
      // Check total cost
      expect(screen.getByText('$183.96')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper heading structure', () => {
      renderWithRouter(
        <BookingConfirmation onNewBooking={mockOnNewBooking} />
      );

      // Main heading
      expect(screen.getByRole('heading', { level: 2, name: 'Booking Confirmed!' })).toBeInTheDocument();
      
      // Section headings should be present
      expect(screen.getByText('Customer Information')).toBeInTheDocument();
      expect(screen.getByText('Vehicle Information')).toBeInTheDocument();
      expect(screen.getByText('Rental Period')).toBeInTheDocument();
    });

    it('has accessible buttons', () => {
      renderWithRouter(
        <BookingConfirmation onNewBooking={mockOnNewBooking} />
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
      
      // All buttons should have accessible text
      buttons.forEach(button => {
        expect(button).toHaveTextContent(/.+/);
      });
    });
  });
});