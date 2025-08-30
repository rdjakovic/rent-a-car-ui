import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ReservationDetails } from '../ReservationDetails';
import * as queries from '@/lib/api/queries';
import { toast } from '@/hooks/use-toast';
import type { ReservationResponseDto } from '@/lib/api/queries';

// Mock the API queries
vi.mock('@/lib/api/queries', () => ({
  confirmReservation: vi.fn(),
  cancelReservation: vi.fn(),
  completeReservation: vi.fn(),
}));

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

const mockConfirmReservation = vi.mocked(queries.confirmReservation);
const mockCancelReservation = vi.mocked(queries.cancelReservation);
const mockCompleteReservation = vi.mocked(queries.completeReservation);
const mockToast = vi.mocked(toast);

const mockPendingReservation: ReservationResponseDto = {
  id: 1,
  startDate: '2025-09-06',
  endDate: '2025-09-09',
  status: 'PENDING',
  totalPrice: 135,
  currency: 'USD',
  notes: 'Customer requested GPS navigation system',
  customer: {
    id: 1,
    firstName: 'Alice',
    lastName: 'Johnson',
    email: 'alice.johnson@email.com',
    phone: '+1-555-0301',
    driverLicenseNo: 'DL123456789',
    dateOfBirth: '1985-03-15',
    address: '789 Oak Street',
    city: 'New York',
    country: 'USA',
    licenseExpiryDate: '2028-03-15',
    fullName: 'Alice Johnson',
    createdAt: '2025-08-30T17:11:00.338788+02:00',
    updatedAt: '2025-08-30T17:11:00.338788+02:00',
  },
  car: {
    id: 1,
    vin: '1HGBH41JXMN109186',
    make: 'Toyota',
    model: 'Camry',
    year: 2023,
    category: 'INTERMEDIATE',
    transmission: 'AUTOMATIC',
    fuelType: 'GASOLINE',
    seats: 5,
    status: 'AVAILABLE',
    dailyPrice: 45,
    color: 'Silver',
    displayName: '2023 Toyota Camry',
    branchName: 'Downtown Branch',
  },
  pickupBranch: {
    id: 1,
    name: 'Downtown Branch',
    address: '123 Main Street',
    city: 'New York',
    country: 'USA',
    phone: '+1-555-0101',
    email: 'downtown@rentacar.com',
    openingHours: 'Mon-Fri 8:00-18:00, Sat 9:00-17:00, Sun 10:00-16:00',
    active: false,
    createdAt: '2025-08-30T17:11:00.338788+02:00',
    updatedAt: '2025-08-30T17:11:00.338788+02:00',
  },
  dropoffBranch: {
    id: 1,
    name: 'Downtown Branch',
    address: '123 Main Street',
    city: 'New York',
    country: 'USA',
    phone: '+1-555-0101',
    email: 'downtown@rentacar.com',
    openingHours: 'Mon-Fri 8:00-18:00, Sat 9:00-17:00, Sun 10:00-16:00',
    active: false,
    createdAt: '2025-08-30T17:11:00.338788+02:00',
    updatedAt: '2025-08-30T17:11:00.338788+02:00',
  },
  createdAt: '2025-08-30T17:11:00.338788+02:00',
  updatedAt: '2025-08-30T17:11:00.338788+02:00',
  durationDays: 3,
  dailyRate: 45,
};

const mockConfirmedReservation: ReservationResponseDto = {
  ...mockPendingReservation,
  id: 2,
  status: 'CONFIRMED',
};

const mockCompletedReservation: ReservationResponseDto = {
  ...mockPendingReservation,
  id: 3,
  status: 'COMPLETED',
};

function renderWithProviders(component: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
}

describe('ReservationDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders reservation details correctly', () => {
    renderWithProviders(<ReservationDetails reservation={mockPendingReservation} />);

    // Check header
    expect(screen.getByText('Reservation #1')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();

    // Check customer information
    expect(screen.getByText('Customer Information')).toBeInTheDocument();
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    expect(screen.getByText('alice.johnson@email.com')).toBeInTheDocument();
    expect(screen.getByText('+1-555-0301')).toBeInTheDocument();
    expect(screen.getByText('DL123456789')).toBeInTheDocument();

    // Check vehicle information
    expect(screen.getByText('Vehicle Information')).toBeInTheDocument();
    expect(screen.getByText('2023 Toyota Camry')).toBeInTheDocument();
    expect(screen.getByText('INTERMEDIATE')).toBeInTheDocument();
    expect(screen.getByText('AUTOMATIC')).toBeInTheDocument();
    expect(screen.getByText('GASOLINE')).toBeInTheDocument();

    // Check rental details
    expect(screen.getByText('Rental Details')).toBeInTheDocument();
    expect(screen.getAllByText('3 days')).toHaveLength(2); // Appears in duration and pricing
    expect(screen.getAllByText('Downtown Branch')).toHaveLength(2); // Appears in pickup and dropoff

    // Check pricing
    expect(screen.getByText('Pricing Information')).toBeInTheDocument();
    expect(screen.getByText('$45.00')).toBeInTheDocument();
    expect(screen.getByText('$135.00')).toBeInTheDocument();

    // Check notes
    expect(screen.getByText('Notes')).toBeInTheDocument();
    expect(screen.getByText('Customer requested GPS navigation system')).toBeInTheDocument();
  });

  it('shows correct action buttons for pending reservation', () => {
    renderWithProviders(<ReservationDetails reservation={mockPendingReservation} />);

    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Confirm')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.queryByText('Complete')).not.toBeInTheDocument();
  });

  it('shows correct action buttons for confirmed reservation', () => {
    renderWithProviders(<ReservationDetails reservation={mockConfirmedReservation} />);

    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Complete')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.queryByText('Confirm')).not.toBeInTheDocument();
  });

  it('shows no action buttons for completed reservation', () => {
    renderWithProviders(<ReservationDetails reservation={mockCompletedReservation} />);

    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
    expect(screen.queryByText('Confirm')).not.toBeInTheDocument();
    expect(screen.queryByText('Complete')).not.toBeInTheDocument();
    expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
  });

  it('confirms reservation successfully', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    const updatedReservation = { ...mockPendingReservation, status: 'CONFIRMED' as const };
    mockConfirmReservation.mockResolvedValue(updatedReservation);

    renderWithProviders(
      <ReservationDetails reservation={mockPendingReservation} onUpdate={onUpdate} />
    );

    const confirmButton = screen.getByText('Confirm');
    await user.click(confirmButton);

    await waitFor(() => {
      expect(mockConfirmReservation).toHaveBeenCalledWith(1);
      expect(onUpdate).toHaveBeenCalledWith(updatedReservation);
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Reservation Confirmed',
        description: 'Reservation #1 has been confirmed.',
      });
    });
  });

  it('cancels reservation successfully', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    const updatedReservation = { ...mockPendingReservation, status: 'CANCELLED' as const };
    mockCancelReservation.mockResolvedValue(updatedReservation);

    renderWithProviders(
      <ReservationDetails reservation={mockPendingReservation} onUpdate={onUpdate} />
    );

    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);

    await waitFor(() => {
      expect(mockCancelReservation).toHaveBeenCalledWith(1);
      expect(onUpdate).toHaveBeenCalledWith(updatedReservation);
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Reservation Cancelled',
        description: 'Reservation #1 has been cancelled.',
      });
    });
  });

  it('completes reservation successfully', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    const updatedReservation = { ...mockConfirmedReservation, status: 'COMPLETED' as const };
    mockCompleteReservation.mockResolvedValue(updatedReservation);

    renderWithProviders(
      <ReservationDetails reservation={mockConfirmedReservation} onUpdate={onUpdate} />
    );

    const completeButton = screen.getByText('Complete');
    await user.click(completeButton);

    await waitFor(() => {
      expect(mockCompleteReservation).toHaveBeenCalledWith(2);
      expect(onUpdate).toHaveBeenCalledWith(updatedReservation);
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Reservation Completed',
        description: 'Reservation #2 has been marked as completed.',
      });
    });
  });

  it('handles API errors gracefully', async () => {
    const user = userEvent.setup();
    mockConfirmReservation.mockRejectedValue(new Error('API Error'));

    renderWithProviders(<ReservationDetails reservation={mockPendingReservation} />);

    const confirmButton = screen.getByText('Confirm');
    await user.click(confirmButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Failed to confirm reservation. Please try again.',
        variant: 'destructive',
      });
    });
  });

  it('opens edit dialog when edit button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ReservationDetails reservation={mockPendingReservation} />);

    const editButton = screen.getByText('Edit');
    await user.click(editButton);

    await waitFor(() => {
      expect(screen.getByText('Edit Reservation')).toBeInTheDocument();
      expect(screen.getByText('Reservation editing functionality will be implemented in a future update.')).toBeInTheDocument();
    });
  });

  it('formats currency correctly', () => {
    renderWithProviders(<ReservationDetails reservation={mockPendingReservation} />);

    expect(screen.getByText('$45.00')).toBeInTheDocument();
    expect(screen.getByText('$135.00')).toBeInTheDocument();
  });

  it('formats dates correctly', () => {
    renderWithProviders(<ReservationDetails reservation={mockPendingReservation} />);

    // Check that dates are formatted (the exact format may vary based on locale)
    expect(screen.getByText(/September.*06.*2025/)).toBeInTheDocument();
    expect(screen.getByText(/September.*09.*2025/)).toBeInTheDocument();
  });

  it('handles missing optional data gracefully', () => {
    const reservationWithMissingData = {
      ...mockPendingReservation,
      notes: undefined,
      customer: {
        ...mockPendingReservation.customer!,
        phone: undefined,
      },
    };

    renderWithProviders(<ReservationDetails reservation={reservationWithMissingData} />);

    expect(screen.getByText('N/A')).toBeInTheDocument(); // For missing phone
    expect(screen.queryByText('Notes')).not.toBeInTheDocument(); // Notes section should not appear
  });

  it('disables buttons during API calls', async () => {
    const user = userEvent.setup();
    // Mock a slow API call
    mockConfirmReservation.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));

    renderWithProviders(<ReservationDetails reservation={mockPendingReservation} />);

    const confirmButton = screen.getByText('Confirm');
    await user.click(confirmButton);

    // Button should show loading state
    expect(screen.getByText('Confirming...')).toBeInTheDocument();
    expect(confirmButton).toBeDisabled();
  });
});