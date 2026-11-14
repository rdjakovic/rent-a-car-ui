import { afterEach, describe, expect, it, vi } from 'vitest'
import { daysFromToday, toDateString, todayString } from '../dates'

describe('dates', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  // Times built with the local-time Date constructor: just after midnight catches a UTC-based "today"
  // on machines ahead of UTC, just before midnight on machines behind it.
  it.each([
    ['just after local midnight', new Date(2026, 0, 15, 0, 30)],
    ['just before local midnight', new Date(2026, 0, 15, 23, 30)],
  ])('uses the local date %s', (_, now) => {
    vi.useFakeTimers()
    vi.setSystemTime(now)

    expect(todayString()).toBe('2026-01-15')
    expect(daysFromToday(-1)).toBe('2026-01-14')
    expect(daysFromToday(17)).toBe('2026-02-01')
  })

  it('formats with zero padding', () => {
    expect(toDateString(new Date(2026, 2, 5))).toBe('2026-03-05')
  })
})
