import { describe, it, expect } from 'vitest'
import { validateBookingParams } from '../bookingParams'
import { daysFromToday } from '@/lib/dates'

const params = (overrides: Record<string, string | undefined> = {}) => {
  const base: Record<string, string | undefined> = {
    carId: '7', branchId: '3', startDate: daysFromToday(2), endDate: daysFromToday(5), dailyPrice: '45.99',
  }
  const merged = { ...base, ...overrides }
  return new URLSearchParams(Object.entries(merged).filter(([, v]) => v !== undefined) as [string, string][])
}

const error = (overrides: Record<string, string | undefined>) => {
  const result = validateBookingParams(params(overrides))
  return result.isValid ? undefined : result.error
}

describe('validateBookingParams', () => {
  it('accepts a normal booking link', () => {
    expect(validateBookingParams(params())).toEqual({ isValid: true })
  })

  it('accepts a same-day rental, starting today', () => {
    const today = daysFromToday(0)
    expect(validateBookingParams(params({ startDate: today, endDate: today }))).toEqual({ isValid: true })
  })

  it('lists every missing parameter', () => {
    expect(error({ endDate: undefined, dailyPrice: undefined }))
      .toBe('Missing required booking parameters: endDate, dailyPrice. Please start from the availability search.')
  })

  it.each([
    ['carId', 'abc', 'Invalid car ID'],
    ['carId', '0', 'Invalid car ID'],
    ['carId', '1.5', 'Invalid car ID'],
    ['branchId', '-1', 'Invalid branch ID'],
    ['dailyPrice', 'free', 'Invalid daily price'],
    ['dailyPrice', '0', 'Invalid daily price'],
  ])('rejects %s=%s', (name, value, message) => {
    expect(error({ [name]: value })).toContain(message)
  })

  it.each([
    'tomorrow',
    '2026-1-5',          // not yyyy-mm-dd: it would not compare correctly with today's date
    '2026-02-31',        // not a real date
    '2026-13-01',
    '2026-12-01T10:00',
  ])('rejects the date %s', (value) => {
    expect(error({ startDate: value })).toContain('Invalid date format')
    expect(error({ endDate: value })).toContain('Invalid date format')
  })

  it('rejects a start date in the past, and an end date before the start', () => {
    expect(error({ startDate: daysFromToday(-1), endDate: daysFromToday(2) })).toContain('Start date cannot be in the past')
    expect(error({ startDate: daysFromToday(4), endDate: daysFromToday(3) })).toContain('End date cannot be before start date')
  })
})
