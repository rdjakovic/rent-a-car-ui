import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import BookingWizard from '../BookingWizard'
import type { CarListResponseDto, CustomerResponseDto, ReservationResponseDto } from '@/lib/api/queries'
import type { BookingDetails } from '@/stores/useBookingFlowStore'

// Generate future dates for testing
const tomorrow = new Date()
tomorrow.setDate(tomorrow.getDate() + 1)
const dayAfterTomorrow = new Date()
dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 5)

const startDate = tomorrow.toISOString().split('T')[0]
const endDate = dayAfterTomorrow.toISOString().split('T')[0]

// Mock the useBookingFlow hook with working state
const mockBookingFlow: {
  currentStep: 'customer' | 'review' | 'confirmation'
  carDetails: CarListResponseDto | null
  bookingDetails: BookingDetails | null
  customer: CustomerResponseDto | null
  totalDays: number
  totalCost: number
  reservation: ReservationResponseDto | null
  isSubmitting: boolean
  submissionError: string | null
  initializeBooking: ReturnType<typeof vi.fn>
  setCustomer: ReturnType<typeof vi.fn>
  calculateCost: ReturnType<typeof vi.fn>
  nextStep: ReturnType<typeof vi.fn>
  previousStep: ReturnType<typeof vi.fn>
  setReservation: ReturnType<typeof vi.fn>
  setSubmitting: ReturnType<typeof vi.fn>
  setSubmissionError: ReturnType<typeof vi.fn>
  reset: ReturnType<typeof vi.fn>
  canProceedToReview: ReturnType<typeof vi.fn>
  canSubmitBooking: ReturnType<typeof vi.fn>
  isStepComplete: ReturnType<typeof vi.fn>
  getStepNumber: ReturnType<typeof vi.fn>
  initializeFromUrlParams: ReturnType<typeof vi.fn>
} = {
  currentStep: 'customer',
  carDetails: {
    id: 101,
    displayName: 'Toyota Camry',
    category: 'INTERMEDIATE',
    dailyPrice: 45.99,
    branchName: 'Main Branch',
  },
  bookingDetails: {
    carId: 101,
    branchId: 1,
    startDate: startDate,
    endDate: endDate,
    dailyPrice: 45.99,
  },
  customer: null,
  totalDays: 4,
  totalCost: 183.96,
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
  initializeFromUrlParams: vi.fn(() => true),
}

vi.mock('@/hooks/useBookingFlow', () => ({
  useBookingFlow: () => mockBookingFlow,
}))

// Mock react-router-dom with valid parameters (future dates)
const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams(`carId=101&branchId=1&startDate=${startDate}&endDate=${endDate}&dailyPrice=45.99&carDisplayName=Toyota%20Camry&carCategory=INTERMEDIATE&branchName=Main%20Branch`)],
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

describe('BookingWizard - Integration Tests', () => {
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

  it('renders successfully with valid booking data', () => {
    renderWithProviders(<BookingWizard />)

    expect(screen.getByText('Book Your Rental')).toBeInTheDocument()
    expect(screen.getByTestId('customer-selection')).toBeInTheDocument()
  })

  it('displays breadcrumb navigation', () => {
    renderWithProviders(<BookingWizard />)

    // Check for breadcrumb navigation elements
    expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /go to availability search/i })).toBeInTheDocument()
  })

  it('displays booking summary with car details', () => {
    renderWithProviders(<BookingWizard />)

    expect(screen.getByText('Booking Summary')).toBeInTheDocument()
    expect(screen.getByText('Toyota Camry')).toBeInTheDocument()
    expect(screen.getByText(startDate)).toBeInTheDocument()
    expect(screen.getByText(endDate)).toBeInTheDocument()
    expect(screen.getByText('4 days')).toBeInTheDocument()
    expect(screen.getByText('$183.96')).toBeInTheDocument()
  })

  it('displays step indicators', () => {
    renderWithProviders(<BookingWizard />)

    expect(screen.getByText('1. Customer Selection')).toBeInTheDocument()
    expect(screen.getByText('2. Review & Confirm')).toBeInTheDocument()
    expect(screen.getByText('3. Confirmation')).toBeInTheDocument()
  })

  it('calls initializeFromUrlParams on mount when no booking details exist', () => {
    // Temporarily clear booking details to trigger initialization
    const originalBookingDetails = mockBookingFlow.bookingDetails
    mockBookingFlow.bookingDetails = null

    renderWithProviders(<BookingWizard />)

    expect(mockBookingFlow.initializeFromUrlParams).toHaveBeenCalled()
    
    // Restore original state
    mockBookingFlow.bookingDetails = originalBookingDetails
  })

  it('renders customer selection step by default', () => {
    renderWithProviders(<BookingWizard />)

    expect(screen.getByTestId('customer-selection')).toBeInTheDocument()
    expect(screen.queryByTestId('booking-review')).not.toBeInTheDocument()
    expect(screen.queryByTestId('booking-confirmation')).not.toBeInTheDocument()
  })
})