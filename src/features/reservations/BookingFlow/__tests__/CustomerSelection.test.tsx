import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CustomerSelection from '../CustomerSelection';
import { useBookingFlowStore } from '@/stores/useBookingFlowStore';
import * as apiQueries from '@/lib/api/queries';
import type { CustomerResponseDto, PageCustomerResponseDto } from '@/lib/api/queries';

// Mock the API queries
vi.mock('@/lib/api/queries', () => ({
  listCustomers: vi.fn(),
}));

// Mock the debounce hook
vi.mock('@/hooks/useDebounce', () => ({
  useDebounce: vi.fn((value) => value), // Return value immediately for testing
}));

// Mock the customer form dialog
vi.mock('@/features/customers/CustomerFormDialog', () => ({
  default: ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => (
    open ? (
      <div data-testid="customer-form-dialog">
        <button onClick={() => onOpenChange(false)}>Close Dialog</button>
      </div>
    ) : null
  ),
}));

// Mock customer data
const createMockCustomer = (overrides: Partial<CustomerResponseDto> = {}): CustomerResponseDto => ({
  id: 1,
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  phone: '+1234567890',
  driverLicenseNo: 'DL123456789',
  dateOfBirth: '1990-01-01',
  address: '123 Main St',
  city: 'New York',
  country: 'US',
  licenseExpiryDate: '2025-12-31',
  fullName: 'John Doe',
  ...overrides,
});

const createMockCustomersResponse = (customers: CustomerResponseDto[]): PageCustomerResponseDto => ({
  content: customers,
  number: 0,
  size: 10,
  totalElements: customers.length,
  totalPages: Math.ceil(customers.length / 10),
  first: true,
  last: true,
  empty: customers.length === 0,
});

function TestProviders({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe('CustomerSelection', () => {
  const mockOnNext = vi.fn();
  const mockOnBack = vi.fn();
  const mockListCustomers = vi.mocked(apiQueries.listCustomers);

  beforeEach(() => {
    // Reset store state and mocks before each test
    useBookingFlowStore.getState().reset();
    mockOnNext.mockClear();
    mockOnBack.mockClear();
    mockListCustomers.mockClear();
  });

  describe('initial render', () => {
    it('should render customer selection interface', async () => {
      mockListCustomers.mockResolvedValue(createMockCustomersResponse([]));

      render(
        <TestProviders>
          <CustomerSelection onNext={mockOnNext} onBack={mockOnBack} />
        </TestProviders>
      );

      expect(screen.getByText('Select Customer')).toBeInTheDocument();
      expect(screen.getByText('Search for an existing customer or create a new one for this booking.')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search by name, email, phone, or license number...')).toBeInTheDocument();
      expect(screen.getByText('New Customer')).toBeInTheDocument();
    });

    it('should have disabled Continue button initially', async () => {
      mockListCustomers.mockResolvedValue(createMockCustomersResponse([]));

      render(
        <TestProviders>
          <CustomerSelection onNext={mockOnNext} onBack={mockOnBack} />
        </TestProviders>
      );

      await waitFor(() => {
        const continueButton = screen.getByText('Continue to Review');
        expect(continueButton).toBeDisabled();
      });
    });

    it('should show Back button when onBack is provided', async () => {
      mockListCustomers.mockResolvedValue(createMockCustomersResponse([]));

      render(
        <TestProviders>
          <CustomerSelection onNext={mockOnNext} onBack={mockOnBack} />
        </TestProviders>
      );

      expect(screen.getByText('Back')).toBeInTheDocument();
      expect(screen.getByText('Back')).not.toBeDisabled();
    });

    it('should disable Back button when onBack is not provided', async () => {
      mockListCustomers.mockResolvedValue(createMockCustomersResponse([]));

      render(
        <TestProviders>
          <CustomerSelection onNext={mockOnNext} />
        </TestProviders>
      );

      expect(screen.getByText('Back')).toBeDisabled();
    });
  });

  describe('customer search', () => {
    it('should display search results', async () => {
      const customers = [
        createMockCustomer({ id: 1, firstName: 'John', lastName: 'Doe' }),
        createMockCustomer({ id: 2, firstName: 'Jane', lastName: 'Smith' }),
      ];
      mockListCustomers.mockResolvedValue(createMockCustomersResponse(customers));

      render(
        <TestProviders>
          <CustomerSelection onNext={mockOnNext} onBack={mockOnBack} />
        </TestProviders>
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });
    });

    it('should handle search input', async () => {
      const user = userEvent.setup();
      mockListCustomers.mockResolvedValue(createMockCustomersResponse([]));

      render(
        <TestProviders>
          <CustomerSelection onNext={mockOnNext} onBack={mockOnBack} />
        </TestProviders>
      );

      const searchInput = screen.getByPlaceholderText('Search by name, email, phone, or license number...');
      
      await user.type(searchInput, 'John');

      expect(searchInput).toHaveValue('John');
      expect(screen.getByText('Searching for "John"...')).toBeInTheDocument();
    });

    it('should show empty state when no customers found', async () => {
      mockListCustomers.mockResolvedValue(createMockCustomersResponse([]));

      render(
        <TestProviders>
          <CustomerSelection onNext={mockOnNext} onBack={mockOnBack} />
        </TestProviders>
      );

      await waitFor(() => {
        expect(screen.getByText('No customers found.')).toBeInTheDocument();
        expect(screen.getByText('Create New Customer')).toBeInTheDocument();
      });
    });

    it('should show search-specific empty state', async () => {
      const user = userEvent.setup();
      mockListCustomers.mockResolvedValue(createMockCustomersResponse([]));

      render(
        <TestProviders>
          <CustomerSelection onNext={mockOnNext} onBack={mockOnBack} />
        </TestProviders>
      );

      const searchInput = screen.getByPlaceholderText('Search by name, email, phone, or license number...');
      await user.type(searchInput, 'NonExistent');

      await waitFor(() => {
        expect(screen.getByText('No customers found matching your search.')).toBeInTheDocument();
      });
    });

    it('should handle API errors', async () => {
      mockListCustomers.mockRejectedValue(new Error('API Error'));

      render(
        <TestProviders>
          <CustomerSelection onNext={mockOnNext} onBack={mockOnBack} />
        </TestProviders>
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to load customers. Please try again.')).toBeInTheDocument();
      });
    });
  });

  describe('customer selection', () => {
    it('should allow selecting a valid customer', async () => {
      const user = userEvent.setup();
      const customer = createMockCustomer();
      mockListCustomers.mockResolvedValue(createMockCustomersResponse([customer]));

      render(
        <TestProviders>
          <CustomerSelection onNext={mockOnNext} onBack={mockOnBack} />
        </TestProviders>
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const selectButton = screen.getByText('Select');
      await user.click(selectButton);

      // Should show selected customer
      await waitFor(() => {
        expect(screen.getByText('Selected Customer')).toBeInTheDocument();
        expect(screen.getByText('Continue to Review')).not.toBeDisabled();
      });
    });

    it('should prevent selecting customer without license', async () => {
      const user = userEvent.setup();
      const customer = createMockCustomer({ driverLicenseNo: '' });
      mockListCustomers.mockResolvedValue(createMockCustomersResponse([customer]));

      render(
        <TestProviders>
          <CustomerSelection onNext={mockOnNext} onBack={mockOnBack} />
        </TestProviders>
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('No License')).toBeInTheDocument();
      });

      const selectButton = screen.getByText('Invalid');
      expect(selectButton).toBeDisabled();
    });

    it('should prevent selecting customer with expired license', async () => {
      const user = userEvent.setup();
      const customer = createMockCustomer({ licenseExpiryDate: '2020-01-01' });
      mockListCustomers.mockResolvedValue(createMockCustomersResponse([customer]));

      render(
        <TestProviders>
          <CustomerSelection onNext={mockOnNext} onBack={mockOnBack} />
        </TestProviders>
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('License Expired')).toBeInTheDocument();
      });

      const selectButton = screen.getByText('Invalid');
      expect(selectButton).toBeDisabled();
    });

    it('should allow changing selected customer', async () => {
      const user = userEvent.setup();
      const customer = createMockCustomer();
      mockListCustomers.mockResolvedValue(createMockCustomersResponse([customer]));

      render(
        <TestProviders>
          <CustomerSelection onNext={mockOnNext} onBack={mockOnBack} />
        </TestProviders>
      );

      // Select customer
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const selectButton = screen.getByText('Select');
      await user.click(selectButton);

      // Should show selected customer
      await waitFor(() => {
        expect(screen.getByText('Selected Customer')).toBeInTheDocument();
      });

      // Change customer
      const changeButton = screen.getByText('Change Customer');
      await user.click(changeButton);

      // Should go back to customer list
      await waitFor(() => {
        expect(screen.getByText('Available Customers')).toBeInTheDocument();
        expect(screen.queryByText('Selected Customer')).not.toBeInTheDocument();
      });
    });
  });

  describe('validation', () => {
    it('should show validation error when trying to continue without customer', async () => {
      const user = userEvent.setup();
      mockListCustomers.mockResolvedValue(createMockCustomersResponse([]));

      render(
        <TestProviders>
          <CustomerSelection onNext={mockOnNext} onBack={mockOnBack} />
        </TestProviders>
      );

      const continueButton = screen.getByText('Continue to Review');
      await user.click(continueButton);

      await waitFor(() => {
        expect(screen.getByText('Please select a customer')).toBeInTheDocument();
      });

      expect(mockOnNext).not.toHaveBeenCalled();
    });

    it('should show validation error for invalid customer selection', async () => {
      const user = userEvent.setup();
      const customer = createMockCustomer({ driverLicenseNo: '' });
      mockListCustomers.mockResolvedValue(createMockCustomersResponse([customer]));

      // Manually set invalid customer in store
      act(() => {
        useBookingFlowStore.getState().setCustomer(customer);
      });

      render(
        <TestProviders>
          <CustomerSelection onNext={mockOnNext} onBack={mockOnBack} />
        </TestProviders>
      );

      const continueButton = screen.getByText('Continue to Review');
      await user.click(continueButton);

      await waitFor(() => {
        expect(screen.getByText('Customer must have a driver license number')).toBeInTheDocument();
      });

      expect(mockOnNext).not.toHaveBeenCalled();
    });

    it('should call onNext when valid customer is selected', async () => {
      const user = userEvent.setup();
      const customer = createMockCustomer();

      // Set valid customer in store
      act(() => {
        useBookingFlowStore.getState().setCustomer(customer);
      });

      render(
        <TestProviders>
          <CustomerSelection onNext={mockOnNext} onBack={mockOnBack} />
        </TestProviders>
      );

      const continueButton = screen.getByText('Continue to Review');
      await user.click(continueButton);

      expect(mockOnNext).toHaveBeenCalled();
    });
  });

  describe('customer creation dialog', () => {
    it('should open customer creation dialog', async () => {
      const user = userEvent.setup();
      mockListCustomers.mockResolvedValue(createMockCustomersResponse([]));

      render(
        <TestProviders>
          <CustomerSelection onNext={mockOnNext} onBack={mockOnBack} />
        </TestProviders>
      );

      const newCustomerButton = screen.getByText('New Customer');
      await user.click(newCustomerButton);

      expect(screen.getByTestId('customer-form-dialog')).toBeInTheDocument();
    });

    it('should close customer creation dialog', async () => {
      const user = userEvent.setup();
      mockListCustomers.mockResolvedValue(createMockCustomersResponse([]));

      render(
        <TestProviders>
          <CustomerSelection onNext={mockOnNext} onBack={mockOnBack} />
        </TestProviders>
      );

      // Open dialog
      const newCustomerButton = screen.getByText('New Customer');
      await user.click(newCustomerButton);

      expect(screen.getByTestId('customer-form-dialog')).toBeInTheDocument();

      // Close dialog
      const closeButton = screen.getByText('Close Dialog');
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId('customer-form-dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('pagination', () => {
    it('should show pagination controls when there are multiple pages', async () => {
      const customers = Array.from({ length: 15 }, (_, i) => 
        createMockCustomer({ id: i + 1, firstName: `Customer${i + 1}` })
      );
      const response: PageCustomerResponseDto = {
        content: customers.slice(0, 10),
        number: 0,
        size: 10,
        totalElements: 15,
        totalPages: 2,
        first: true,
        last: false,
        empty: false,
      };
      mockListCustomers.mockResolvedValue(response);

      render(
        <TestProviders>
          <CustomerSelection onNext={mockOnNext} onBack={mockOnBack} />
        </TestProviders>
      );

      await waitFor(() => {
        expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
        expect(screen.getByText('Previous')).toBeDisabled();
        expect(screen.getByText('Next')).not.toBeDisabled();
      });
    });

    it('should handle pagination navigation', async () => {
      const user = userEvent.setup();
      const customers = Array.from({ length: 15 }, (_, i) => 
        createMockCustomer({ id: i + 1, firstName: `Customer${i + 1}` })
      );
      
      // First page response
      const firstPageResponse: PageCustomerResponseDto = {
        content: customers.slice(0, 10),
        number: 0,
        size: 10,
        totalElements: 15,
        totalPages: 2,
        first: true,
        last: false,
        empty: false,
      };

      // Second page response
      const secondPageResponse: PageCustomerResponseDto = {
        content: customers.slice(10, 15),
        number: 1,
        size: 10,
        totalElements: 15,
        totalPages: 2,
        first: false,
        last: true,
        empty: false,
      };

      mockListCustomers
        .mockResolvedValueOnce(firstPageResponse)
        .mockResolvedValueOnce(secondPageResponse);

      render(
        <TestProviders>
          <CustomerSelection onNext={mockOnNext} onBack={mockOnBack} />
        </TestProviders>
      );

      await waitFor(() => {
        expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
      });

      // Click next page
      const nextButton = screen.getByText('Next');
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
        expect(screen.getByText('Previous')).not.toBeDisabled();
        expect(screen.getByText('Next')).toBeDisabled();
      });
    });
  });

  describe('loading states', () => {
    it('should show loading skeleton while fetching customers', async () => {
      // Create a promise that we can control
      let resolvePromise: (value: PageCustomerResponseDto) => void;
      const promise = new Promise<PageCustomerResponseDto>((resolve) => {
        resolvePromise = resolve;
      });
      mockListCustomers.mockReturnValue(promise);

      render(
        <TestProviders>
          <CustomerSelection onNext={mockOnNext} onBack={mockOnBack} />
        </TestProviders>
      );

      // Should show loading skeletons
      expect(screen.getAllByTestId('skeleton')).toHaveLength(5);

      // Resolve the promise
      act(() => {
        resolvePromise!(createMockCustomersResponse([]));
      });

      await waitFor(() => {
        expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument();
      });
    });
  });

  describe('navigation handlers', () => {
    it('should call onBack when Back button is clicked', async () => {
      const user = userEvent.setup();
      mockListCustomers.mockResolvedValue(createMockCustomersResponse([]));

      render(
        <TestProviders>
          <CustomerSelection onNext={mockOnNext} onBack={mockOnBack} />
        </TestProviders>
      );

      const backButton = screen.getByText('Back');
      await user.click(backButton);

      expect(mockOnBack).toHaveBeenCalled();
    });
  });

  describe('store integration', () => {
    it('should display pre-selected customer from store', async () => {
      const customer = createMockCustomer();
      mockListCustomers.mockResolvedValue(createMockCustomersResponse([]));

      // Pre-select customer in store
      act(() => {
        useBookingFlowStore.getState().setCustomer(customer);
      });

      render(
        <TestProviders>
          <CustomerSelection onNext={mockOnNext} onBack={mockOnBack} />
        </TestProviders>
      );

      await waitFor(() => {
        expect(screen.getByText('Selected Customer')).toBeInTheDocument();
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Continue to Review')).not.toBeDisabled();
      });
    });
  });
});