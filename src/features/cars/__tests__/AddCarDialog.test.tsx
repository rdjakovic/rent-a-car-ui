import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, beforeEach, expect } from 'vitest';
import AddCarDialog from '../AddCarDialog';
import * as queries from '@/lib/api/queries';

// Mock the API queries
vi.mock('@/lib/api/queries', () => ({
  createCar: vi.fn(),
  listBranches: vi.fn(),
}));

const mockCreateCar = vi.mocked(queries.createCar);
const mockListBranches = vi.mocked(queries.listBranches);

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('AddCarDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock branches response
    mockListBranches.mockResolvedValue({
      content: [
        { id: 1, name: 'Downtown Branch', city: 'New York' },
        { id: 2, name: 'Airport Branch', city: 'Los Angeles' },
      ],
      totalElements: 2,
      totalPages: 1,
      first: true,
      last: true,
      size: 100,
      number: 0,
      numberOfElements: 2,
      empty: false,
    });
  });

  it('renders dialog when open', async () => {
    const onOpenChange = vi.fn();

    render(
      <AddCarDialog open={true} onOpenChange={onOpenChange} />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Add New Car')).toBeInTheDocument();
    expect(screen.getByText('Add a new vehicle to the fleet. All required fields must be filled.')).toBeInTheDocument();
  });

  it('does not render dialog when closed', () => {
    const onOpenChange = vi.fn();

    render(
      <AddCarDialog open={false} onOpenChange={onOpenChange} />,
      { wrapper: createWrapper() }
    );

    expect(screen.queryByText('Add New Car')).not.toBeInTheDocument();
  });

  it('displays form fields with correct labels', async () => {
    const onOpenChange = vi.fn();

    render(
      <AddCarDialog open={true} onOpenChange={onOpenChange} />,
      { wrapper: createWrapper() }
    );

    // Wait for branches to load
    await waitFor(() => {
      expect(mockListBranches).toHaveBeenCalled();
    });

    // Check required fields
    expect(screen.getByLabelText(/VIN.*\*/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Make.*\*/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Model.*\*/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Year.*\*/)).toBeInTheDocument();
    expect(screen.getByText(/Category.*\*/)).toBeInTheDocument();
    expect(screen.getByText(/Transmission.*\*/)).toBeInTheDocument();
    expect(screen.getByText(/Fuel Type.*\*/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Seats.*\*/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Daily Price.*\*/)).toBeInTheDocument();
    expect(screen.getByText(/Branch.*\*/)).toBeInTheDocument();

    // Check optional fields
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByLabelText('Mileage')).toBeInTheDocument();
    expect(screen.getByLabelText('Color')).toBeInTheDocument();
    expect(screen.getByLabelText('License Plate')).toBeInTheDocument();
    expect(screen.getByLabelText('Insurance Policy')).toBeInTheDocument();
  });

  it('calls onOpenChange when cancel button is clicked', async () => {
    const onOpenChange = vi.fn();

    render(
      <AddCarDialog open={true} onOpenChange={onOpenChange} />,
      { wrapper: createWrapper() }
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('submits form with valid data', async () => {
    const onOpenChange = vi.fn();
    mockCreateCar.mockResolvedValue({
      id: 1,
      vin: 'TEST12345678901234',
      make: 'Toyota',
      model: 'Camry',
      year: 2023,
      category: 'ECONOMY',
      transmission: 'AUTOMATIC',
      fuelType: 'GASOLINE',
      seats: 5,
      dailyPrice: 50.00,
      status: 'AVAILABLE',
    });

    render(
      <AddCarDialog open={true} onOpenChange={onOpenChange} />,
      { wrapper: createWrapper() }
    );

    // Wait for branches to load
    await waitFor(() => {
      expect(mockListBranches).toHaveBeenCalled();
    });

    // Fill required fields
    fireEvent.change(screen.getByLabelText(/VIN.*\*/), {
      target: { value: 'TEST12345678901234' }
    });
    fireEvent.change(screen.getByLabelText(/Make.*\*/), {
      target: { value: 'Toyota' }
    });
    fireEvent.change(screen.getByLabelText(/Model.*\*/), {
      target: { value: 'Camry' }
    });
    fireEvent.change(screen.getByLabelText(/Year.*\*/), {
      target: { value: '2023' }
    });
    fireEvent.change(screen.getByLabelText(/Daily Price.*\*/), {
      target: { value: '50.00' }
    });

    // Category (use role-based query within the field block)
    const categoryField = screen.getByText(/Category \*/i).closest('div') as HTMLElement;
    const categoryTrigger = within(categoryField).getByRole('combobox');
    fireEvent.click(categoryTrigger);
    await waitFor(() => expect(screen.getByRole('option', { name: 'ECONOMY' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('option', { name: 'ECONOMY' }));

    // Transmission
    const transmissionField = screen.getByText(/Transmission \*/i).closest('div') as HTMLElement;
    const transmissionTrigger = within(transmissionField).getByRole('combobox');
    fireEvent.click(transmissionTrigger);
    await waitFor(() => expect(screen.getByRole('option', { name: 'AUTOMATIC' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('option', { name: 'AUTOMATIC' }));

    // Fuel Type
    const fuelField = screen.getByText(/Fuel Type \*/i).closest('div') as HTMLElement;
    const fuelTrigger = within(fuelField).getByRole('combobox');
    fireEvent.click(fuelTrigger);
    await waitFor(() => expect(screen.getByRole('option', { name: 'GASOLINE' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('option', { name: 'GASOLINE' }));

    // Seats
    fireEvent.change(screen.getByLabelText(/Seats.*\*/), {
      target: { value: '5' }
    });

    // Branch
    const branchField = screen.getByText(/Branch \*/i).closest('div') as HTMLElement;
    const branchTrigger = within(branchField).getByRole('combobox');
    fireEvent.click(branchTrigger);
    await waitFor(() => expect(screen.getByRole('option', { name: 'Downtown Branch - New York' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('option', { name: 'Downtown Branch - New York' }));

    // Submit form
    const submitButton = screen.getByText('Add Car');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCreateCar).toHaveBeenCalledWith({
        vin: 'TEST12345678901234',
        make: 'Toyota',
        model: 'Camry',
        year: 2023,
        category: 'ECONOMY',
        transmission: 'AUTOMATIC',
        fuelType: 'GASOLINE',
        seats: 5,
        dailyPrice: 50.00,
        branchId: 1,
        status: 'AVAILABLE',
      });
    });

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('displays error message when submission fails', async () => {
    const onOpenChange = vi.fn();
    mockCreateCar.mockRejectedValue(new Error('Failed to create car'));

    render(
      <AddCarDialog open={true} onOpenChange={onOpenChange} />,
      { wrapper: createWrapper() }
    );

    // Wait for branches to load
    await waitFor(() => {
      expect(mockListBranches).toHaveBeenCalled();
    });

    // Fill minimum required fields and submit
    fireEvent.change(screen.getByLabelText(/VIN.*\*/), {
      target: { value: 'TEST12345678901234' }
    });
    fireEvent.change(screen.getByLabelText(/Make.*\*/), {
      target: { value: 'Toyota' }
    });
    fireEvent.change(screen.getByLabelText(/Model.*\*/), {
      target: { value: 'Camry' }
    });
    fireEvent.change(screen.getByLabelText(/Year.*\*/), {
      target: { value: '2023' }
    });
    fireEvent.change(screen.getByLabelText(/Daily Price.*\*/), {
      target: { value: '50.00' }
    });

    // Select branch (use the same Radix Select pattern as the valid submit test)
    const branchField = screen.getByText(/Branch \*/i).closest('div') as HTMLElement;
    const branchTrigger = within(branchField).getByRole('combobox');
    fireEvent.click(branchTrigger);
    await waitFor(() => expect(screen.getByRole('option', { name: 'Downtown Branch - New York' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('option', { name: 'Downtown Branch - New York' }));

    const submitButton = screen.getByText('Add Car');
    fireEvent.click(submitButton);

    // Ensure the mutation was attempted, then wait for the error UI
    await waitFor(() => expect(mockCreateCar).toHaveBeenCalled())
    const errorEl = await screen.findByText(/Failed to create car/i)
    expect(errorEl).toBeInTheDocument()

    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});