import { describe, it, expect, beforeEach, vi } from 'vitest'
import BookingWizard from '../BookingWizard'
import {
  renderWithProviders,
  waitForText,
  waitForTestId,
  waitForLoadingToComplete,
  waitForStateChange,
  TEST_TIMEOUTS,
  cleanupMocks,
} from '@/lib/test-utils'
import {
  BookingParamsFactory,
  TestScenarioFactory,
  MockFunctionsFactory,
  BookingFlowMockFactory,
  TestDateFactory,
} from '@/lib/test-factories'

// Generate consistent test dates using factory
const { startDate, endDate, duration } = TestDateFactory.getDateRange(1, 5)

// Create mock booking flow state using factory
const mockBookingFlowState = BookingFlowMockFactory.createWithValidBooking(
  {
    id: 101,
    displayName: 'Toyota Camry',
    category: 'INTERMEDIATE',
    dailyPrice: 45.99,
    branchName: 'Main Branch',
  },
  {
    carId: 101,
    branchId: 1,
    startDate,
    endDate,
    dailyPrice: 45.99,
  }
)

// Create mock methods using factory
const mockBookingFlowMethods = MockFunctionsFactory.createBookingFlowMethods()

// Combine state and methods
const mockBookingFlow = {
  ...mockBookingFlowState,
  ...mockBookingFlowMethods,
  totalDays: duration,
  totalCost: duration * 45.99,
}

vi.mock('@/hooks/useBookingFlow', () => ({
  useBookingFlow: () => mockBookingFlow,
}))

// Create router mocks using factory
const routerMocks = MockFunctionsFactory.createRouterMocks()

// Create URL parameters using factory
const testBookingParams = BookingParamsFactory.createValid({
  carId: 101,
  branchId: 1,
  startDate,
  endDate,
  dailyPrice: 45.99,
  carDisplayName: 'Toyota Camry',
  carCategory: 'INTERMEDIATE',
  branchName: 'Main Branch',
})

const testUrlParams = BookingParamsFactory.createUrlSearchParams(testBookingParams)

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => routerMocks.navigate,
    useSearchParams: () => [testUrlParams],
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
  beforeEach(() => {
    // Clean up all mocks using utility
    cleanupMocks(
      ...Object.values(mockBookingFlowMethods),
      ...Object.values(routerMocks)
    )
  })

  it('renders successfully with valid booking data', async () => {
    const scenario = TestScenarioFactory.validBookingScenario()
    
    renderWithProviders(<BookingWizard />, {
      initialEntries: [`/book${scenario.urlParams}`],
    })

    // Wait for component to load with enhanced async handling
    await waitForText('Book Your Rental', {
      timeout: TEST_TIMEOUTS.NORMAL,
    })
    
    await waitForTestId('customer-selection', {
      timeout: TEST_TIMEOUTS.FAST,
    })
  })

  it('displays breadcrumb navigation', async () => {
    const scenario = TestScenarioFactory.validBookingScenario()
    
    renderWithProviders(<BookingWizard />, {
      initialEntries: [`/book${scenario.urlParams}`],
    })

    // Wait for loading to complete
    await waitForLoadingToComplete({
      timeout: TEST_TIMEOUTS.NORMAL,
    })

    // Check for breadcrumb navigation elements with enhanced waiting
    const { screen } = await import('@testing-library/react')
    
    await waitForStateChange(
      () => screen.queryByRole('navigation', { name: /breadcrumb/i }),
      (element) => element !== null,
      { timeout: TEST_TIMEOUTS.FAST }
    )
    
    await waitForStateChange(
      () => screen.queryByRole('link', { name: /go to availability search/i }),
      (element) => element !== null,
      { timeout: TEST_TIMEOUTS.FAST }
    )
  })

  it('displays booking summary with car details', async () => {
    const scenario = TestScenarioFactory.validBookingScenario()
    
    renderWithProviders(<BookingWizard />, {
      initialEntries: [`/book${scenario.urlParams}`],
    })

    // Wait for loading and booking summary to appear
    await waitForLoadingToComplete({
      timeout: TEST_TIMEOUTS.NORMAL,
    })

    await waitForText('Booking Summary', {
      timeout: TEST_TIMEOUTS.NORMAL,
    })

    // Verify all booking details using test data
    await waitForText('Toyota Camry', {
      timeout: TEST_TIMEOUTS.FAST,
    })
    
    await waitForText(startDate, {
      timeout: TEST_TIMEOUTS.FAST,
    })
    
    await waitForText(endDate, {
      timeout: TEST_TIMEOUTS.FAST,
    })
    
    await waitForText(`${duration} days`, {
      timeout: TEST_TIMEOUTS.FAST,
    })
    
    const expectedCost = (duration * 45.99).toFixed(2)
    await waitForText(`$${expectedCost}`, {
      timeout: TEST_TIMEOUTS.FAST,
    })
  })

  it('displays step indicators', async () => {
    const scenario = TestScenarioFactory.validBookingScenario()
    
    renderWithProviders(<BookingWizard />, {
      initialEntries: [`/book${scenario.urlParams}`],
    })

    // Wait for loading and step indicators
    await waitForLoadingToComplete({
      timeout: TEST_TIMEOUTS.NORMAL,
    })

    await waitForText('1. Customer Selection', {
      timeout: TEST_TIMEOUTS.NORMAL,
    })
    
    await waitForText('2. Review & Confirm', {
      timeout: TEST_TIMEOUTS.FAST,
    })
    
    await waitForText('3. Confirmation', {
      timeout: TEST_TIMEOUTS.FAST,
    })
  })

  it('calls initializeFromUrlParams on mount when no booking details exist', async () => {
    // Create scenario with no booking details to trigger initialization
    const emptyState = BookingFlowMockFactory.createInitialState()
    const mockMethods = MockFunctionsFactory.createBookingFlowMethods()
    
    // Temporarily override the mock with empty state
    const originalMock = mockBookingFlow
    Object.assign(mockBookingFlow, { ...emptyState, ...mockMethods })

    const scenario = TestScenarioFactory.validBookingScenario()
    
    renderWithProviders(<BookingWizard />, {
      initialEntries: [`/book${scenario.urlParams}`],
    })

    // Wait for initialization to be called
    await waitForStateChange(
      () => mockBookingFlow.initializeFromUrlParams.mock.calls.length,
      (callCount) => callCount > 0,
      { timeout: TEST_TIMEOUTS.NORMAL }
    )

    expect(mockBookingFlow.initializeFromUrlParams).toHaveBeenCalled()
    
    // Restore original mock
    Object.assign(mockBookingFlow, originalMock)
  })

  it('renders customer selection step by default', async () => {
    const scenario = TestScenarioFactory.validBookingScenario()
    
    renderWithProviders(<BookingWizard />, {
      initialEntries: [`/book${scenario.urlParams}`],
    })

    // Wait for loading and customer selection step
    await waitForLoadingToComplete({
      timeout: TEST_TIMEOUTS.NORMAL,
    })

    await waitForTestId('customer-selection', {
      timeout: TEST_TIMEOUTS.NORMAL,
    })

    // Verify other steps are not rendered
    const { screen } = await import('@testing-library/react')
    expect(screen.queryByTestId('booking-review')).not.toBeInTheDocument()
    expect(screen.queryByTestId('booking-confirmation')).not.toBeInTheDocument()
  })
})