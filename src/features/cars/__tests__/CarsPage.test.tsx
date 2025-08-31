import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import CarsPage from '../CarsPage';
import * as queries from '@/lib/api/queries';

// Mock the API queries
vi.mock('@/lib/api/queries', () => ({
  listCars: vi.fn(),
  listBranches: vi.fn(),
  createCar: vi.fn(),
}));

const mockListCars = vi.mocked(queries.listCars);
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
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('CarsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock cars response
    mockListCars.mockResolvedValue({
      content: [
        {
          id: 1,
          vin: 'TEST12345678901234',
          make: 'Toyota',
          model: 'Camry',
          year: 2023,
          category: 'ECONOMY',
          transmission: 'AUTOMATIC',
          fuelType: 'GASOLINE',
          seats: 5,
          status: 'AVAILABLE',
          dailyPrice: 50.00,
          color: 'White',
          displayName: '2023 Toyota Camry',
          branchName: 'Downtown Branch',
        },
      ],
      totalElements: 1,
      totalPages: 1,
      first: true,
      last: true,
      size: 12,
      number: 0,
      numberOfElements: 1,
      empty: false,
    });

    // Mock branches response
    mockListBranches.mockResolvedValue({
      content: [
        { id: 1, name: 'Downtown Branch', city: 'New York' },
      ],
      totalElements: 1,
      totalPages: 1,
      first: true,
      last: true,
      size: 100,
      number: 0,
      numberOfElements: 1,
      empty: false,
    });
  });

  it('renders the page with Add New Car button', async () => {
    render(<CarsPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Car Catalog')).toBeInTheDocument();
    expect(screen.getByText('Browse our complete fleet of vehicles')).toBeInTheDocument();
    expect(screen.getByText('Add New Car')).toBeInTheDocument();
  });

  it('opens Add Car dialog when button is clicked', async () => {
    render(<CarsPage />, { wrapper: createWrapper() });

    const addButton = screen.getByText('Add New Car');
    fireEvent.click(addButton);

    // Dialog should open
    expect(screen.getByText('Add a new vehicle to the fleet. All required fields must be filled.')).toBeInTheDocument();
  });

  it('displays car cards when data is loaded', async () => {
    render(<CarsPage />, { wrapper: createWrapper() });

    // Wait for cars to load and display
    expect(await screen.findByText('2023 Toyota Camry')).toBeInTheDocument();
    expect(screen.getByText('Downtown Branch')).toBeInTheDocument();
    expect(screen.getByText('ECONOMY')).toBeInTheDocument();
    expect(screen.getByText('AVAILABLE')).toBeInTheDocument();
    expect(screen.getByText('$50.00')).toBeInTheDocument();
  });

  it('shows Add New Car button in header alongside filters', () => {
    render(<CarsPage />, { wrapper: createWrapper() });

    const addButton = screen.getByText('Add New Car');
    expect(addButton).toBeInTheDocument();
    
    // Check that it has the correct styling classes
    expect(addButton).toHaveClass('bg-brand-emerald');
    expect(addButton.closest('button')).toHaveClass('hover:bg-brand-emerald/90');
  });
});