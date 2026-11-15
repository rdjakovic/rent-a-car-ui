import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useBookingFlow } from '../useBookingFlow'
import { daysFromToday } from '@/lib/dates'

// A future rental of 4 days (the booking link's start date can't be in the past)
const START = daysFromToday(1)
const END = daysFromToday(5)

// Mock the store
const mockStore = {
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
}

vi.mock('@/stores/useBookingFlowStore', () => ({
  useBookingFlowStore: () => mockStore,
}))

describe('useBookingFlow - URL Parameter Parsing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset console.error mock
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('successfully initializes from valid URL parameters', () => {
    const { result } = renderHook(() => useBookingFlow())
    
    const searchParams = new URLSearchParams({
      carId: '101',
      branchId: '1',
      startDate: START,
      endDate: END,
      dailyPrice: '45.99',
      carDisplayName: 'Toyota Camry',
      carCategory: 'INTERMEDIATE',
      branchName: 'Main Branch',
    })

    const success = result.current.initializeFromUrlParams(searchParams)

    expect(success).toBe(true)
    expect(mockStore.initializeBooking).toHaveBeenCalledWith({
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
        startDate: START,
        endDate: END,
        dailyPrice: 45.99,
      },
    })
  })

  it('fails when required parameters are missing', () => {
    const { result } = renderHook(() => useBookingFlow())
    
    const searchParams = new URLSearchParams({
      carId: '101',
      branchId: '1',
      // Missing startDate, endDate, dailyPrice
    })

    const success = result.current.initializeFromUrlParams(searchParams)

    expect(success).toBe(false)
    expect(mockStore.initializeBooking).not.toHaveBeenCalled()
    expect(console.error).toHaveBeenCalledWith('Invalid booking parameters:', expect.stringContaining('Missing required booking parameters: startDate, endDate, dailyPrice'))
  })

  it('fails when carId is invalid', () => {
    const { result } = renderHook(() => useBookingFlow())
    
    const searchParams = new URLSearchParams({
      carId: 'invalid',
      branchId: '1',
      startDate: START,
      endDate: END,
      dailyPrice: '45.99',
    })

    const success = result.current.initializeFromUrlParams(searchParams)

    expect(success).toBe(false)
    expect(mockStore.initializeBooking).not.toHaveBeenCalled()
    expect(console.error).toHaveBeenCalledWith('Invalid booking parameters:', expect.stringContaining('Invalid car ID'))
  })

  it('fails when carId is zero or negative', () => {
    const { result } = renderHook(() => useBookingFlow())
    
    const searchParams = new URLSearchParams({
      carId: '0',
      branchId: '1',
      startDate: START,
      endDate: END,
      dailyPrice: '45.99',
    })

    const success = result.current.initializeFromUrlParams(searchParams)

    expect(success).toBe(false)
    expect(mockStore.initializeBooking).not.toHaveBeenCalled()
    expect(console.error).toHaveBeenCalledWith('Invalid booking parameters:', expect.stringContaining('Invalid car ID'))
  })

  it('fails when branchId is invalid', () => {
    const { result } = renderHook(() => useBookingFlow())
    
    const searchParams = new URLSearchParams({
      carId: '101',
      branchId: 'invalid',
      startDate: START,
      endDate: END,
      dailyPrice: '45.99',
    })

    const success = result.current.initializeFromUrlParams(searchParams)

    expect(success).toBe(false)
    expect(mockStore.initializeBooking).not.toHaveBeenCalled()
    expect(console.error).toHaveBeenCalledWith('Invalid booking parameters:', expect.stringContaining('Invalid branch ID'))
  })

  it('fails when branchId is zero or negative', () => {
    const { result } = renderHook(() => useBookingFlow())
    
    const searchParams = new URLSearchParams({
      carId: '101',
      branchId: '-1',
      startDate: START,
      endDate: END,
      dailyPrice: '45.99',
    })

    const success = result.current.initializeFromUrlParams(searchParams)

    expect(success).toBe(false)
    expect(mockStore.initializeBooking).not.toHaveBeenCalled()
    expect(console.error).toHaveBeenCalledWith('Invalid booking parameters:', expect.stringContaining('Invalid branch ID'))
  })

  it('fails when dailyPrice is invalid', () => {
    const { result } = renderHook(() => useBookingFlow())
    
    const searchParams = new URLSearchParams({
      carId: '101',
      branchId: '1',
      startDate: START,
      endDate: END,
      dailyPrice: 'invalid',
    })

    const success = result.current.initializeFromUrlParams(searchParams)

    expect(success).toBe(false)
    expect(mockStore.initializeBooking).not.toHaveBeenCalled()
    expect(console.error).toHaveBeenCalledWith('Invalid booking parameters:', expect.stringContaining('Invalid daily price'))
  })

  it('fails when dailyPrice is zero or negative', () => {
    const { result } = renderHook(() => useBookingFlow())
    
    const searchParams = new URLSearchParams({
      carId: '101',
      branchId: '1',
      startDate: START,
      endDate: END,
      dailyPrice: '0',
    })

    const success = result.current.initializeFromUrlParams(searchParams)

    expect(success).toBe(false)
    expect(mockStore.initializeBooking).not.toHaveBeenCalled()
    expect(console.error).toHaveBeenCalledWith('Invalid booking parameters:', expect.stringContaining('Invalid daily price'))
  })

  it('fails when date format is invalid', () => {
    const { result } = renderHook(() => useBookingFlow())
    
    const searchParams = new URLSearchParams({
      carId: '101',
      branchId: '1',
      startDate: 'invalid-date',
      endDate: END,
      dailyPrice: '45.99',
    })

    const success = result.current.initializeFromUrlParams(searchParams)

    expect(success).toBe(false)
    expect(mockStore.initializeBooking).not.toHaveBeenCalled()
    expect(console.error).toHaveBeenCalledWith('Invalid booking parameters:', expect.stringContaining('Invalid date format'))
  })

  it('uses fallback values for optional parameters', () => {
    const { result } = renderHook(() => useBookingFlow())
    
    const searchParams = new URLSearchParams({
      carId: '101',
      branchId: '1',
      startDate: START,
      endDate: END,
      dailyPrice: '45.99',
      // No optional parameters provided
    })

    const success = result.current.initializeFromUrlParams(searchParams)

    expect(success).toBe(true)
    expect(mockStore.initializeBooking).toHaveBeenCalledWith({
      carDetails: {
        id: 101,
        displayName: 'Unknown Car',
        category: 'ECONOMY',
        dailyPrice: 45.99,
        branchName: 'Unknown Branch',
      },
      bookingDetails: {
        carId: 101,
        branchId: 1,
        startDate: START,
        endDate: END,
        dailyPrice: 45.99,
      },
    })
  })

  it('handles parsing errors gracefully', () => {
    const { result } = renderHook(() => useBookingFlow())
    
    // Mock parseInt to throw an error
    const originalParseInt = global.parseInt
    global.parseInt = vi.fn().mockImplementation(() => {
      throw new Error('Parsing error')
    })

    const searchParams = new URLSearchParams({
      carId: '101',
      branchId: '1',
      startDate: START,
      endDate: END,
      dailyPrice: '45.99',
    })

    const success = result.current.initializeFromUrlParams(searchParams)

    expect(success).toBe(false)
    expect(mockStore.initializeBooking).not.toHaveBeenCalled()
    expect(console.error).toHaveBeenCalledWith('Error parsing URL parameters:', expect.any(Error))

    // Restore original parseInt
    global.parseInt = originalParseInt
  })

  it('handles decimal daily prices correctly', () => {
    const { result } = renderHook(() => useBookingFlow())
    
    const searchParams = new URLSearchParams({
      carId: '101',
      branchId: '1',
      startDate: START,
      endDate: END,
      dailyPrice: '45.99',
    })

    const success = result.current.initializeFromUrlParams(searchParams)

    expect(success).toBe(true)
    expect(mockStore.initializeBooking).toHaveBeenCalledWith({
      carDetails: expect.objectContaining({
        dailyPrice: 45.99,
      }),
      bookingDetails: expect.objectContaining({
        dailyPrice: 45.99,
      }),
    })
  })

  it('handles large car and branch IDs correctly', () => {
    const { result } = renderHook(() => useBookingFlow())
    
    const searchParams = new URLSearchParams({
      carId: '999999',
      branchId: '888888',
      startDate: START,
      endDate: END,
      dailyPrice: '45.99',
    })

    const success = result.current.initializeFromUrlParams(searchParams)

    expect(success).toBe(true)
    expect(mockStore.initializeBooking).toHaveBeenCalledWith({
      carDetails: expect.objectContaining({
        id: 999999,
      }),
      bookingDetails: expect.objectContaining({
        carId: 999999,
        branchId: 888888,
      }),
    })
  })
})