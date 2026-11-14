import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ReservationDetails } from '../ReservationDetails';
import * as queries from '@/lib/api/queries';
import { toast } from '@/hooks/use-toast';
import type { ReservationResponseDto } from '@/lib/api/queries';
import { daysFromToday } from '@/lib/dates';

// Mock the API queries
vi.mock('@/lib/api/queries', () => ({
  confirmReservation: vi.fn(),
  cancelReservation: vi.fn(),
  completeReservation: vi.fn(),
  pickUpReservation: vi.fn(),
  getCarById: vi.fn(),
  getSettings: vi.fn(),
  updateReservation: vi.fn(),
  listBranches: vi.fn(),
}));

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

const mockConfirmReservation = vi.mocked(queries.confirmReservation);
const mockCancelReservation = vi.mocked(queries.cancelReservation);
const mockCompleteReservation = vi.mocked(queries.completeReservation);
const mockPickUpReservation = vi.mocked(queries.pickUpReservation);
const mockUpdateReservation = vi.mocked(queries.updateReservation);
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

// Starts today, so the car can be picked up
const mockConfirmedReservation: ReservationResponseDto = {
  ...mockPendingReservation,
  id: 2,
  status: 'CONFIRMED',
  startDate: daysFromToday(0),
  endDate: daysFromToday(2),
};

const mockActiveReservation: ReservationResponseDto = {
  ...mockPendingReservation,
  id: 4,
  status: 'ACTIVE',
  startDate: daysFromToday(-3),
  endDate: daysFromToday(-1),
  mileageOut: 15100,
  pickedUpAt: '2025-09-06T10:00:00+02:00',
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
    vi.mocked(queries.getSettings).mockResolvedValue({ mileageUnit: 'KILOMETERS' });
    vi.mocked(queries.getCarById).mockResolvedValue({ id: 1, mileage: 15100 } as any);
    vi.mocked(queries.listBranches).mockResolvedValue({ content: [{ id: 1, name: 'Downtown Branch' }] } as any);
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

    // Only PENDING reservations can be edited (the backend rejects changes to confirmed ones)
    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
    expect(screen.getByText('Pick up')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.queryByText('Confirm')).not.toBeInTheDocument();
    expect(screen.queryByText('Return')).not.toBeInTheDocument();
  });

  it('shows no action buttons for completed reservation', () => {
    renderWithProviders(<ReservationDetails reservation={mockCompletedReservation} />);

    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
    expect(screen.queryByText('Confirm')).not.toBeInTheDocument();
    expect(screen.queryByText('Pick up')).not.toBeInTheDocument();
    expect(screen.queryByText('Return')).not.toBeInTheDocument();
    expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
  });

  it('does not offer pick-up outside the rental dates', () => {
    renderWithProviders(
      <ReservationDetails reservation={{ ...mockConfirmedReservation, startDate: daysFromToday(3), endDate: daysFromToday(5) }} />
    );

    expect(screen.queryByText('Pick up')).not.toBeInTheDocument();
  });

  it('shows an active rental with its pick-up details and an overdue return', async () => {
    renderWithProviders(<ReservationDetails reservation={mockActiveReservation} />);

    expect(screen.getByText('Overdue return')).toBeInTheDocument();
    expect(screen.getByText('Return')).toBeInTheDocument();
    expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
    expect(await screen.findByText(new RegExp(`${(15100).toLocaleString()} km`))).toBeInTheDocument();
  });

  it('picks up a car with the odometer reading', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    const updatedReservation = { ...mockConfirmedReservation, status: 'ACTIVE' as const };
    mockPickUpReservation.mockResolvedValue(updatedReservation);

    renderWithProviders(
      <ReservationDetails reservation={mockConfirmedReservation} onUpdate={onUpdate} />
    );

    await user.click(screen.getByText('Pick up'));
    const odometer = await screen.findByLabelText('Odometer (km)');
    await waitFor(() => expect(odometer).toHaveValue(15100));
    await user.click(screen.getByRole('button', { name: 'Pick up' }));

    await waitFor(() => {
      expect(mockPickUpReservation).toHaveBeenCalledWith(2, { mileageOut: 15100 });
      expect(onUpdate).toHaveBeenCalledWith(updatedReservation);
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Car picked up',
        description: 'Reservation #2 is now active.',
      });
    });
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

  it('returns a car; the odometer cannot be below the pick-up reading', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    const updatedReservation = { ...mockActiveReservation, status: 'COMPLETED' as const };
    mockCompleteReservation.mockResolvedValue(updatedReservation);

    renderWithProviders(
      <ReservationDetails reservation={mockActiveReservation} onUpdate={onUpdate} />
    );

    await user.click(screen.getByText('Return'));
    const odometer = await screen.findByLabelText('Odometer (km)');
    await user.clear(odometer);
    await user.type(odometer, '15050');
    expect(screen.getByText(/can't be lower than/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Return' })).toBeDisabled();

    await user.clear(odometer);
    await user.type(odometer, '15400');
    await user.click(screen.getByRole('button', { name: 'Return' }));

    await waitFor(() => {
      expect(mockCompleteReservation).toHaveBeenCalledWith(4, { mileageIn: 15400 });
      expect(onUpdate).toHaveBeenCalledWith(updatedReservation);
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Car returned',
        description: 'Reservation #4 is now completed.',
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

  it('edits the dates of a pending reservation and shows the new total', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    const updatedReservation = { ...mockPendingReservation, startDate: daysFromToday(10), endDate: daysFromToday(14) };
    mockUpdateReservation.mockResolvedValue(updatedReservation);

    renderWithProviders(<ReservationDetails reservation={mockPendingReservation} onUpdate={onUpdate} />);

    await user.click(screen.getByText('Edit'));
    const dialog = await screen.findByRole('dialog');
    const start = within(dialog).getByLabelText('Pickup date');
    const end = within(dialog).getByLabelText('Return date');
    expect(start).toHaveValue(mockPendingReservation.startDate);

    fireEvent.change(start, { target: { value: daysFromToday(10) } });
    fireEvent.change(end, { target: { value: daysFromToday(14) } });
    // 4 days at $45
    expect(within(dialog).getByText('$180.00')).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(mockUpdateReservation).toHaveBeenCalledWith(1, {
        customerId: 1,
        carId: 1,
        pickupBranchId: 1,
        dropoffBranchId: mockPendingReservation.dropoffBranch!.id,
        startDate: daysFromToday(10),
        endDate: daysFromToday(14),
        notes: mockPendingReservation.notes,
      });
      expect(onUpdate).toHaveBeenCalledWith(updatedReservation);
    });
  });

  it('rejects past or reversed dates and shows a conflict from the server', async () => {
    const user = userEvent.setup();
    mockUpdateReservation.mockRejectedValue({ status: 409, detail: 'Car is not available for the selected dates' });

    renderWithProviders(<ReservationDetails reservation={mockPendingReservation} />);

    await user.click(screen.getByText('Edit'));
    const dialog = await screen.findByRole('dialog');
    const start = within(dialog).getByLabelText('Pickup date');
    const end = within(dialog).getByLabelText('Return date');

    fireEvent.change(start, { target: { value: daysFromToday(-1) } });
    fireEvent.change(end, { target: { value: daysFromToday(2) } });
    expect(within(dialog).getByText('Pickup date cannot be in the past')).toBeInTheDocument();

    fireEvent.change(start, { target: { value: daysFromToday(5) } });
    fireEvent.change(end, { target: { value: daysFromToday(4) } });
    expect(within(dialog).getByText('Return date cannot be before pickup date')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Save changes' })).toBeDisabled();

    fireEvent.change(end, { target: { value: daysFromToday(6) } });
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    expect(await within(dialog).findByText('Car is not available for the selected dates')).toBeInTheDocument();
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