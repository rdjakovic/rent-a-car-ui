import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import BookingWizard from '../BookingWizard'
import {
  resetRouterMocks,
  resetBookingFlowMocks,
  configureMockForSuccessfulBooking,
  configureMockForFailedBooking,
  configureMockForLoadingState,
  mockSearchParams,
  TestDataFactory,
  mockNavigate,
  mockUseSearchParams,
  createMockBookingFlow
} from '@/lib/test-utils/mockSetup'

// Set up mocks at module level
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => mockUseSearchParams(),
  }
})

vi.mock('@/hooks/useBookingFlow', () => ({
  useBookingFlow: () => mockBookingFlow,
}))

// Create mock instances
const mockBookingFlow = createMockBookingFlow()

// Mock the child components
vi.mock('../CustomerSelection', () => ({
  default: ({ onBack, onNext }: any) => (
    <div data-testid="customer-selection">
      <button onClick={onBack}>Back</button>
      <button onClick={onNext}>Next</button>
    </div>
  ),
}))

vi.mock('../BookingReview', () => ({
  default: ({ onBack, onSubmit }: any) => (
    <div data-testid="booking-review">
      <button onClick={onBack}>Back</button>
      <button onClick={onSubmit}>Submit</button>
    </div>
  ),
}))

vi.mock('../BookingConfirmation', () => ({
  default: ({ onNewBooking }: any) => (
    <div data-testid="booking-confirmation">
      <button onClick={onNewBooking}>New Booking</button>
    </div>
  ),
}))

vi.mock('../components/BookingBreadcrumbs', () => ({
  default: ({ currentStep, carDisplayName }: any) => (
    <div data-testid="booking-breadcrumbs">
      Step: {currentStep}, Car: {carDisplayName}
    </div>
  ),
}))

describe('BookingWizard - Navigation and Deep Linking', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })

    // Reset all mocks
    vi.clearAllMocks()
    resetRouterMocks()
    resetBookingFlowMocks(mockBookingFlow)

    // Set up default valid search params
    mockSearchParams(TestDataFactory.createValidBookingParams())
  })

  afterEach(() => {
    // Clean up all mocks after each test
    vi.clearAllMocks()
  })

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          {component}
        </QueryClientProvider>
      </BrowserRouter>
    )
  }

  it('initializes booking from valid URL parameters', async () => {
    // Configure mock for successful booking
    configureMockForSuccessfulBooking(mockBookingFlow)

    renderWithProviders(<BookingWizard />)

    // Wait for the component to render the booking interface
    await waitFor(() => {
      expect(screen.getByText('Book Your Rental')).toBeInTheDocument()
    })

    expect(screen.getByTestId('customer-selection')).toBeInTheDocument()
    expect(screen.getByTestId('booking-breadcrumbs')).toBeInTheDocument()
  })

  it('shows error for missing required URL parameters', async () => {
    // Configure mock for failed booking with specific message
    configureMockForFailedBooking(mockBookingFlow, 'Missing required booking parameters')

    // Mock search params with missing required parameters
    mockSearchParams(TestDataFactory.createInvalidBookingParams('missing'))

    renderWithProviders(<BookingWizard />)

    await waitFor(() => {
      expect(screen.getByText('Unable to Load Booking')).toBeInTheDocument()
      expect(screen.getByText(/Missing required booking parameters/)).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: /start new search/i })).toBeInTheDocument()
  })

  it('shows error for invalid car ID parameter', async () => {
    configureMockForFailedBooking(mockBookingFlow, 'Invalid car ID. Please start from the availability search')

    // Mock search params with invalid car ID
    mockSearchParams(TestDataFactory.createInvalidBookingParams('invalid-car'))

    renderWithProviders(<BookingWizard />)

    await waitFor(() => {
      expect(screen.getByText('Unable to Load Booking')).toBeInTheDocument()
      expect(screen.getByText(/Invalid car ID. Please start from the availability search/)).toBeInTheDocument()
    })
  })

  it('shows error for invalid branch ID parameter', async () => {
    configureMockForFailedBooking(mockBookingFlow, 'Invalid branch ID. Please start from the availability search')

    // Mock search params with invalid branch ID
    mockSearchParams(TestDataFactory.createInvalidBookingParams('invalid-branch'))

    renderWithProviders(<BookingWizard />)

    await waitFor(() => {
      expect(screen.getByText('Unable to Load Booking')).toBeInTheDocument()
      expect(screen.getByText(/Invalid branch ID. Please start from the availability search/)).toBeInTheDocument()
    })
  })

  it('shows error for invalid daily price parameter', async () => {
    configureMockForFailedBooking(mockBookingFlow, 'Invalid daily price. Please start from the availability search')

    // Mock search params with invalid daily price
    mockSearchParams(TestDataFactory.createInvalidBookingParams('invalid-price'))

    renderWithProviders(<BookingWizard />)

    await waitFor(() => {
      expect(screen.getByText('Unable to Load Booking')).toBeInTheDocument()
      expect(screen.getByText(/Invalid daily price. Please start from the availability search/)).toBeInTheDocument()
    })
  })

  it('shows error for invalid date format', async () => {
    configureMockForFailedBooking(mockBookingFlow, 'Invalid date format. Please start from the availability search')

    // Mock search params with invalid date format
    mockSearchParams(TestDataFactory.createInvalidBookingParams('invalid-date'))

    renderWithProviders(<BookingWizard />)

    await waitFor(() => {
      expect(screen.getByText('Unable to Load Booking')).toBeInTheDocument()
      expect(screen.getByText(/Invalid date format. Please start from the availability search/)).toBeInTheDocument()
    })
  })

  it('shows error for past start date', async () => {
    configureMockForFailedBooking(mockBookingFlow, 'Start date cannot be in the past. Please start from the availability search')

    // Mock search params with past date
    mockSearchParams(TestDataFactory.createInvalidBookingParams('past-date'))

    renderWithProviders(<BookingWizard />)

    await waitFor(() => {
      expect(screen.getByText('Unable to Load Booking')).toBeInTheDocument()
      expect(screen.getByText(/Start date cannot be in the past. Please start from the availability search/)).toBeInTheDocument()
    })
  })

  it('shows error for end date before start date', async () => {
    // Configure mock for failed booking with specific message
    configureMockForFailedBooking(mockBookingFlow, 'End date must be after start date. Please start from the availability search')

    // Mock search params with end date before start date
    mockSearchParams(TestDataFactory.createInvalidBookingParams('date-order'))

    renderWithProviders(<BookingWizard />)

    await waitFor(() => {
      expect(screen.getByText('Unable to Load Booking')).toBeInTheDocument()
      expect(screen.getByText(/End date must be after start date/)).toBeInTheDocument()
    })
  })

  it('displays breadcrumb navigation with car details', async () => {
    // Set up successful initialization - set the state first, then mock the return value
    mockBookingFlow.carDetails = TestDataFactory.createMockCar()
    mockBookingFlow.bookingDetails = TestDataFactory.createMockBookingDetails()
    mockBookingFlow.initializeFromUrlParams.mockReturnValue(true)

    renderWithProviders(<BookingWizard />)

    await waitFor(() => {
      expect(screen.getByTestId('booking-breadcrumbs')).toBeInTheDocument()
      expect(screen.getByText(/Step 1: Customer Selection/)).toBeInTheDocument()
    })
  })

  it('provides retry functionality for failed initialization', async () => {
    mockBookingFlow.initializeFromUrlParams.mockReturnValue(false)

    renderWithProviders(<BookingWizard />)

    await waitFor(() => {
      expect(screen.getByText('Unable to Load Booking')).toBeInTheDocument()
    })

    const retryButton = screen.getByRole('button', { name: /retry/i })
    expect(retryButton).toBeInTheDocument()
  })

  it('navigates to availability page when Start New Search is clicked', async () => {
    configureMockForFailedBooking(mockBookingFlow, 'Invalid booking parameters. Please start from the availability search')

    renderWithProviders(<BookingWizard />)

    await waitFor(() => {
      const startNewSearchButton = screen.getByTestId('start-new-search-button')
      startNewSearchButton.click()
    })

    expect(mockNavigate).toHaveBeenCalledWith('/')
    expect(mockBookingFlow.reset).toHaveBeenCalled()
  })

  it('shows loading state when booking details are not yet loaded', async () => {
    // Configure mock for loading state - successful init but no details yet
    configureMockForLoadingState(mockBookingFlow)

    // Use valid params to avoid validation errors
    mockSearchParams(TestDataFactory.createValidBookingParams())

    renderWithProviders(<BookingWizard />)

    await waitFor(() => {
      expect(screen.getByTestId('loading-message')).toBeInTheDocument()
    })
  })

  it('displays booking summary with correct details', async () => {
    // Set up successful initialization with calculated values - set the state first
    mockBookingFlow.carDetails = TestDataFactory.createMockCar()
    mockBookingFlow.bookingDetails = TestDataFactory.createMockBookingDetails()
    mockBookingFlow.totalDays = 4
    mockBookingFlow.totalCost = 183.96
    mockBookingFlow.initializeFromUrlParams.mockReturnValue(true)

    renderWithProviders(<BookingWizard />)

    await waitFor(() => {
      expect(screen.getByText('Booking Summary')).toBeInTheDocument()
      expect(screen.getByText('Toyota Camry')).toBeInTheDocument()

      // Get the dynamic dates from the mock data
      const mockBookingDetails = TestDataFactory.createMockBookingDetails()
      expect(screen.getByText(mockBookingDetails.startDate)).toBeInTheDocument()
      expect(screen.getByText(mockBookingDetails.endDate)).toBeInTheDocument()

      expect(screen.getByText('4 days')).toBeInTheDocument()
      expect(screen.getByText('$183.96')).toBeInTheDocument()
    })
  })
})