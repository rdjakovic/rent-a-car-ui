import { vi } from 'vitest'

/**
 * Centralized mock setup utilities for consistent test configuration
 */

// Mock functions for React Router hooks
export const mockNavigate = vi.fn()
export const mockUseSearchParams = vi.fn()

/**
 * Sets up React Router mocks with proper Vitest syntax
 */
export function setupRouterMocks() {
  vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom')
    return {
      ...actual,
      useNavigate: () => mockNavigate,
      useSearchParams: () => mockUseSearchParams(),
    }
  })
}

/**
 * Creates a mock URLSearchParams with setter function tuple
 */
export function createMockSearchParams(params: URLSearchParams): [URLSearchParams, (params: URLSearchParams) => void] {
  const setSearchParams = vi.fn()
  return [params, setSearchParams]
}

/**
 * Sets up mock search params for a test
 */
export function mockSearchParams(params: URLSearchParams) {
  const mockTuple = createMockSearchParams(params)
  mockUseSearchParams.mockReturnValue(mockTuple)
  return mockTuple
}

/**
 * Resets all router mocks
 */
export function resetRouterMocks() {
  mockNavigate.mockClear()
  mockUseSearchParams.mockClear()
}

/**
 * Resets all booking flow mocks to initial state
 */
export function resetBookingFlowMocks(mockBookingFlow: ReturnType<typeof createMockBookingFlow>) {
  // Reset state properties
  Object.assign(mockBookingFlow, {
    carDetails: null,
    bookingDetails: null,
    currentStep: 'customer',
    totalDays: 0,
    totalCost: 0,
    customer: null,
    reservation: null,
    isLoading: false,
    isSubmitting: false,
    submissionError: null,
    initializationError: null,
  })
  
  // Reset all mock functions
  mockBookingFlow.initializeFromUrlParams.mockReturnValue(false)
  mockBookingFlow.initializeBooking.mockClear()
  mockBookingFlow.setCustomer.mockClear()
  mockBookingFlow.calculateCost.mockClear()
  mockBookingFlow.nextStep.mockClear()
  mockBookingFlow.previousStep.mockClear()
  mockBookingFlow.setReservation.mockClear()
  mockBookingFlow.setLoading.mockClear()
  mockBookingFlow.setSubmitting.mockClear()
  mockBookingFlow.setSubmissionError.mockClear()
  mockBookingFlow.setInitializationError.mockClear()
  mockBookingFlow.reset.mockClear()
  mockBookingFlow.canProceedToReview.mockReturnValue(false)
  mockBookingFlow.canSubmitBooking.mockReturnValue(false)
  mockBookingFlow.isStepComplete.mockReturnValue(false)
  mockBookingFlow.getStepNumber.mockReturnValue(1)
}

/**
 * Configures booking flow mock for successful initialization
 */
export function configureMockForSuccessfulBooking(mockBookingFlow: ReturnType<typeof createMockBookingFlow>) {
  mockBookingFlow.carDetails = TestDataFactory.createMockCar()
  mockBookingFlow.bookingDetails = TestDataFactory.createMockBookingDetails()
  mockBookingFlow.initializeFromUrlParams.mockResolvedValue(true)
  mockBookingFlow.canProceedToReview.mockReturnValue(true)
  mockBookingFlow.isStepComplete.mockImplementation((step) => step === 'customer')
}

/**
 * Configures booking flow mock for failed initialization
 */
export function configureMockForFailedBooking(mockBookingFlow: ReturnType<typeof createMockBookingFlow>) {
  mockBookingFlow.carDetails = null
  mockBookingFlow.bookingDetails = null
  mockBookingFlow.initializeFromUrlParams.mockResolvedValue(false)
  mockBookingFlow.canProceedToReview.mockReturnValue(false)
  mockBookingFlow.isStepComplete.mockReturnValue(false)
}

/**
 * Configures booking flow mock for loading state
 */
export function configureMockForLoadingState(mockBookingFlow: ReturnType<typeof createMockBookingFlow>) {
  mockBookingFlow.carDetails = null
  mockBookingFlow.bookingDetails = null
  mockBookingFlow.isLoading = true
  mockBookingFlow.initializeFromUrlParams.mockResolvedValue(true) // Successful init but no details yet
  mockBookingFlow.canProceedToReview.mockReturnValue(false)
  mockBookingFlow.isStepComplete.mockReturnValue(false)
}

/**
 * Mock booking flow store for tests
 */
export const createMockBookingFlow = () => ({
  // State properties
  currentStep: 'customer' as const,
  carDetails: null,
  bookingDetails: null,
  customer: null,
  totalDays: 0,
  totalCost: 0,
  reservation: null,
  isLoading: false,
  isSubmitting: false,
  submissionError: null,
  initializationError: null,

  // Action methods
  initializeBooking: vi.fn(),
  setCustomer: vi.fn(),
  calculateCost: vi.fn(),
  calculateDuration: vi.fn(),
  calculateTotalCost: vi.fn(),
  validateUrlParameters: vi.fn(),
  nextStep: vi.fn(),
  previousStep: vi.fn(),
  setReservation: vi.fn(),
  setLoading: vi.fn(),
  setSubmitting: vi.fn(),
  setSubmissionError: vi.fn(),
  setInitializationError: vi.fn(),
  reset: vi.fn(),

  // Computed values and helpers
  canProceedToReview: vi.fn(() => false),
  canSubmitBooking: vi.fn(() => false),
  isStepComplete: vi.fn(() => false),
  getStepNumber: vi.fn(() => 1),
  initializeFromUrlParams: vi.fn(),
})

/**
 * Sets up booking flow store mock
 */
export function setupBookingFlowMocks() {
  const mockBookingFlow = createMockBookingFlow()
  
  vi.mock('@/hooks/useBookingFlow', () => ({
    useBookingFlow: () => mockBookingFlow,
  }))
  
  return mockBookingFlow
}

/**
 * Test data factory for creating consistent test scenarios
 */
export class TestDataFactory {
  static createValidBookingParams(): URLSearchParams {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const nextWeek = new Date()
    nextWeek.setDate(nextWeek.getDate() + 7)
    
    return new URLSearchParams({
      carId: '101',
      branchId: '1',
      startDate: tomorrow.toISOString().split('T')[0],
      endDate: nextWeek.toISOString().split('T')[0],
      dailyPrice: '45.99',
      carDisplayName: 'Toyota Camry',
      carCategory: 'INTERMEDIATE',
      branchName: 'Main Branch'
    })
  }

  static createInvalidBookingParams(type: 'missing' | 'invalid-car' | 'invalid-branch' | 'invalid-price' | 'invalid-date' | 'past-date' | 'date-order'): URLSearchParams {
    switch (type) {
      case 'missing':
        return new URLSearchParams('carId=101&branchId=1') // Missing required params
      
      case 'invalid-car':
        const tomorrow1 = new Date()
        tomorrow1.setDate(tomorrow1.getDate() + 1)
        const nextWeek1 = new Date()
        nextWeek1.setDate(nextWeek1.getDate() + 7)
        return new URLSearchParams(`carId=invalid&branchId=1&startDate=${tomorrow1.toISOString().split('T')[0]}&endDate=${nextWeek1.toISOString().split('T')[0]}&dailyPrice=45.99`)
      
      case 'invalid-branch':
        const tomorrow2 = new Date()
        tomorrow2.setDate(tomorrow2.getDate() + 1)
        const nextWeek2 = new Date()
        nextWeek2.setDate(nextWeek2.getDate() + 7)
        return new URLSearchParams(`carId=101&branchId=0&startDate=${tomorrow2.toISOString().split('T')[0]}&endDate=${nextWeek2.toISOString().split('T')[0]}&dailyPrice=45.99`)
      
      case 'invalid-price':
        const tomorrow3 = new Date()
        tomorrow3.setDate(tomorrow3.getDate() + 1)
        const nextWeek3 = new Date()
        nextWeek3.setDate(nextWeek3.getDate() + 7)
        return new URLSearchParams(`carId=101&branchId=1&startDate=${tomorrow3.toISOString().split('T')[0]}&endDate=${nextWeek3.toISOString().split('T')[0]}&dailyPrice=-10`)
      
      case 'invalid-date':
        const nextWeek4 = new Date()
        nextWeek4.setDate(nextWeek4.getDate() + 7)
        return new URLSearchParams(`carId=101&branchId=1&startDate=invalid-date&endDate=${nextWeek4.toISOString().split('T')[0]}&dailyPrice=45.99`)
      
      case 'past-date':
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const pastDate = yesterday.toISOString().split('T')[0]
        const nextWeek5 = new Date()
        nextWeek5.setDate(nextWeek5.getDate() + 7)
        return new URLSearchParams(`carId=101&branchId=1&startDate=${pastDate}&endDate=${nextWeek5.toISOString().split('T')[0]}&dailyPrice=45.99`)
      
      case 'date-order':
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        const dayAfterTomorrow = new Date()
        dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2)
        const startDate = dayAfterTomorrow.toISOString().split('T')[0] // Later date
        const endDate = tomorrow.toISOString().split('T')[0] // Earlier date
        return new URLSearchParams(`carId=101&branchId=1&startDate=${startDate}&endDate=${endDate}&dailyPrice=45.99`)
      
      default:
        return new URLSearchParams()
    }
  }

  static createMockCar() {
    return {
      id: 101,
      displayName: 'Toyota Camry',
      category: 'INTERMEDIATE',
      dailyPrice: 45.99,
      branchName: 'Main Branch',
    }
  }

  static createMockBookingDetails() {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const nextWeek = new Date()
    nextWeek.setDate(nextWeek.getDate() + 7)
    
    return {
      carId: 101,
      branchId: 1,
      startDate: tomorrow.toISOString().split('T')[0],
      endDate: nextWeek.toISOString().split('T')[0],
      dailyPrice: 45.99,
    }
  }
}