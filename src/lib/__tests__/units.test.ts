import { describe, it, expect } from 'vitest'
import { formatMileage } from '../units'

describe('formatMileage', () => {
  it('appends the configured unit', () => {
    expect(formatMileage(15000, 'KILOMETERS')).toBe(`${(15000).toLocaleString()} km`)
    expect(formatMileage(15000, 'MILES')).toBe(`${(15000).toLocaleString()} mi`)
  })

  it('shows only the number while the unit is unknown', () => {
    expect(formatMileage(15000, undefined)).toBe((15000).toLocaleString())
  })

  it('returns undefined when there is no mileage', () => {
    expect(formatMileage(undefined, 'MILES')).toBeUndefined()
    expect(formatMileage(null, 'MILES')).toBeUndefined()
  })
})
