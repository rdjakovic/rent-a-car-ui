import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import BookingWizard from '../BookingWizard'

// Mock the useBookingFlow hook
const mockBookingFlow = {
  currentStep: 'customer' as const,
  carDetails: null,
  bookingDetails: null,
  customer: null,
  totalDays: 0,
  totalCost: 0,
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
  canProceedToReview: vi.fn(() => false),
  canSubmitBooking: vi.fn(() => false),
  isStepComplete: vi.fn(() => false),
  getStepNumber: vi.fn(() => 1),
  initializeFromUrlParams: vi.fn(),
}

vi.mock('@/hooks/useBookingFlow', () => ({
  useBookingFlow: () => mockBookingFlow,
}))

// Mock react-router-dom
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams('carId=101&branchId=1&startDate=2024-12-01&endDate=2024-12-05&dailyPrice=45.99&carDisplayName=Toyota%20Camry&carCategory=INTERMEDIATE&branchName=Main%20Branch')],
  }
})

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
    vi.clearAllMocks()
    
    // Reset mock state
    mockBookingFlow.carDetails = null
    mockBookingFlow.bookingDetails = null
    mockBookingFlow.currentStep = 'customer'
    mockBookingFlow.totalDays = 0
    mockBookingFlow.totalCost = 0
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
    mockBookingFlow.initializeFromUrlParams.mockReturnValue(true)
    mockBookingFlow.carDetails = {
      id: 101,
      displayName: 'Toyota Camry',
      category: 'INTERMEDIATE',
      dailyPrice: 45.99,
      branchName: 'Main Branch',
    }
    mockBookingFlow.bookingDetails = {
      carId: 101,
      branchId: 1,
      startDate: '2024-12-01',
      endDate: '2024-12-05',
      dailyPrice: 45.99,
    }

    renderWithProviders(<BookingWizard />)

    await waitFor(() => {
      expect(mockBookingFlow.initializeFromUrlParams).toHaveBeenCalled()
    })

    expect(screen.getByText('Book Your Rental')).toBeInTheDocument()
    expect(screen.getByTestId('customer-selection')).toBeInTheDocument()
  })

  it('shows error for missing required URL parameters', async () => {
    mockBookingFlow.initializeFromUrlParams.mockReturnValue(false)
    mockBookingFlow.bookingDetails = null // Ensure no booking details

    // Create a new mock for this specific test
    const mockUseSearchParams = vi.fn(() => [
      new URLSearchParams('carId=101&branchId=1') // Missing required params
    ])
    
    vi.doMock('react-router-dom', async () => {
      const actual = await vi.importActual('react-router-dom')
      return {
        ...actual,
        useNavigate: () => mockNavigate,
        useSearchParams: mockUseSearchParams,
      }
    })

    renderWithProviders(<BookingWizard />)

    await waitFor(() => {
      expect(screen.getByText('Unable to Load Booking')).toBeInTheDocument()
      expect(screen.getByText(/Missing required booking parameters/)).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: /start new search/i })).toBeInTheDocument()
  })

  it('shows error for invalid car ID parameter', async () => {
    mockBookingFlow.initializeFromUrlParams.mockReturnValue(false)

    // Mock useSearchParams to return invalid carId
    vi.mocked(require('react-router-dom').useSearchParams).mockReturnValue([
      new URLSearchParams('carId=invalid&branchId=1&startDate=2024-12-01&endDate=2024-12-05&dailyPrice=45.99')
    ])

    renderWithProviders(<BookingWizard />)

    await waitFor(() => {
      expect(screen.getByText('Unable to Load Booking')).toBeInTheDocument()
      expect(screen.getByText(/Invalid car ID/)).toBeInTheDocument()
    })
  })

  it('shows error for invalid branch ID parameter', async () => {
    mockBookingFlow.initializeFromUrlParams.mockReturnValue(false)

    // Mock useSearchParams to return invalid branchId
    vi.mocked(require('react-router-dom').useSearchParams).mockReturnValue([
      new URLSearchParams('carId=101&branchId=0&startDate=2024-12-01&endDate=2024-12-05&dailyPrice=45.99')
    ])

    renderWithProviders(<BookingWizard />)

    await waitFor(() => {
      expect(screen.getByText('Unable to Load Booking')).toBeInTheDocument()
      expect(screen.getByText(/Invalid branch ID/)).toBeInTheDocument()
    })
  })

  it('shows error for invalid daily price parameter', async () => {
    mockBookingFlow.initializeFromUrlParams.mockReturnValue(false)

    // Mock useSearchParams to return invalid dailyPrice
    vi.mocked(require('react-router-dom').useSearchParams).mockReturnValue([
      new URLSearchParams('carId=101&branchId=1&startDate=2024-12-01&endDate=2024-12-05&dailyPrice=-10')
    ])

    renderWithProviders(<BookingWizard />)

    await waitFor(() => {
      expect(screen.getByText('Unable to Load Booking')).toBeInTheDocument()
      expect(screen.getByText(/Invalid daily price/)).toBeInTheDocument()
    })
  })

  it('shows error for invalid date format', async () => {
    mockBookingFlow.initializeFromUrlParams.mockReturnValue(false)

    // Mock useSearchParams to return invalid date format
    vi.mocked(require('react-router-dom').useSearchParams).mockReturnValue([
      new URLSearchParams('carId=101&branchId=1&startDate=invalid-date&endDate=2024-12-05&dailyPrice=45.99')
    ])

    renderWithProviders(<BookingWizard />)

    await waitFor(() => {
      expect(screen.getByText('Unable to Load Booking')).toBeInTheDocument()
      expect(screen.getByText(/Invalid date format/)).toBeInTheDocument()
    })
  })

  it('shows error for past start date', async () => {
    mockBookingFlow.initializeFromUrlParams.mockReturnValue(false)

    // Mock useSearchParams to return past date
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const pastDate = yesterday.toISOString().split('T')[0]

    vi.mocked(require('react-router-dom').useSearchParams).mockReturnValue([
      new URLSearchParams(`carId=101&branchId=1&startDate=${pastDate}&endDate=2024-12-05&dailyPrice=45.99`)
    ])

    renderWithProviders(<BookingWizard />)

    await waitFor(() => {
      expect(screen.getByText('Unable to Load Booking')).toBeInTheDocument()
      expect(screen.getByText(/Start date cannot be in the past/)).toBeInTheDocument()
    })
  })

  it('shows error for end date before start date', async () => {
    mockBookingFlow.initializeFromUrlParams.mockReturnValue(false)

    // Mock useSearchParams to return end date before start date
    vi.mocked(require('react-router-dom').useSearchParams).mockReturnValue([
      new URLSearchParams('carId=101&branchId=1&startDate=2024-12-05&endDate=2024-12-01&dailyPrice=45.99')
    ])

    renderWithProviders(<BookingWizard />)

    await waitFor(() => {
      expect(screen.getByText('Unable to Load Booking')).toBeInTheDocument()
      expect(screen.getByText(/End date must be after start date/)).toBeInTheDocument()
    })
  })

  it('displays breadcrumb navigation with car details', async () => {
    mockBookingFlow.initializeFromUrlParams.mockReturnValue(true)
    mockBookingFlow.carDetails = {
      id: 101,
      displayName: 'Toyota Camry',
      category: 'INTERMEDIATE',
      dailyPrice: 45.99,
      branchName: 'Main Branch',
    }
    mockBookingFlow.bookingDetails = {
      carId: 101,
      branchId: 1,
      startDate: '2024-12-01',
      endDate: '2024-12-05',
      dailyPrice: 45.99,
    }

    renderWithProviders(<BookingWizard />)

    await waitFor(() => {
      expect(screen.getByTestId('booking-breadcrumbs')).toBeInTheDocument()
      expect(screen.getByText(/Step: customer, Car: Toyota Camry/)).toBeInTheDocument()
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
    mockBookingFlow.initializeFromUrlParams.mockReturnValue(false)

    renderWithProviders(<BookingWizard />)

    await waitFor(() => {
      const startNewSearchButton = screen.getByRole('button', { name: /start new search/i })
      startNewSearchButton.click()
    })

    expect(mockNavigate).toHaveBeenCalledWith('/')
    expect(mockBookingFlow.reset).toHaveBeenCalled()
  })

  it('shows loading state when booking details are not yet loaded', () => {
    mockBookingFlow.carDetails = null
    mockBookingFlow.bookingDetails = null

    renderWithProviders(<BookingWizard />)

    expect(screen.getByText('Loading booking details...')).toBeInTheDocument()
  })

  it('displays booking summary with correct details', async () => {
    mockBookingFlow.initializeFromUrlParams.mockReturnValue(true)
    mockBookingFlow.carDetails = {
      id: 101,
      displayName: 'Toyota Camry',
      category: 'INTERMEDIATE',
      dailyPrice: 45.99,
      branchName: 'Main Branch',
    }
    mockBookingFlow.bookingDetails = {
      carId: 101,
      branchId: 1,
      startDate: '2024-12-01',
      endDate: '2024-12-05',
      dailyPrice: 45.99,
    }
    mockBookingFlow.totalDays = 4
    mockBookingFlow.totalCost = 183.96

    renderWithProviders(<BookingWizard />)

    await waitFor(() => {
      expect(screen.getByText('Booking Summary')).toBeInTheDocument()
      expect(screen.getByText('Toyota Camry')).toBeInTheDocument()
      expect(screen.getByText('2024-12-01')).toBeInTheDocument()
      expect(screen.getByText('2024-12-05')).toBeInTheDocument()
      expect(screen.getByText('4 days')).toBeInTheDocument()
      expect(screen.getByText('$183.96')).toBeInTheDocument()
    })
  })
})