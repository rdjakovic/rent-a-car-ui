import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { describeNextBooking, NextBooking } from '../NextBooking'

const TODAY = '2026-11-14'

describe('describeNextBooking', () => {
  it('describes a future booking with its dates', () => {
    const result = describeNextBooking({ id: 1, status: 'CONFIRMED', startDate: '2026-11-20', endDate: '2026-11-22' }, TODAY)
    expect(result.text).toMatch(/^Next booking: .*20 – .*22$/)
    expect(result.urgent).toBe(false)
  })

  it('marks pending bookings', () => {
    const result = describeNextBooking({ id: 1, status: 'PENDING', startDate: '2026-11-20', endDate: '2026-11-20' }, TODAY)
    expect(result.text).toMatch(/^Next booking: .*20 \(pending\)$/)
  })

  it('flags a booking that covers today', () => {
    expect(describeNextBooking({ id: 1, status: 'CONFIRMED', startDate: TODAY, endDate: TODAY }, TODAY))
      .toEqual({ text: 'Booked today', urgent: true })
    expect(describeNextBooking({ id: 1, status: 'CONFIRMED', startDate: '2026-11-13', endDate: '2026-11-16' }, TODAY).text)
      .toMatch(/^Booked today until .*16$/)
  })

  it('describes a rental that is out, and one that is overdue', () => {
    expect(describeNextBooking({ id: 1, status: 'ACTIVE', startDate: '2026-11-12', endDate: '2026-11-16' }, TODAY))
      .toEqual(expect.objectContaining({ urgent: false, text: expect.stringMatching(/^On rent until .*16$/) }))
    expect(describeNextBooking({ id: 1, status: 'ACTIVE', startDate: '2026-11-08', endDate: '2026-11-13' }, TODAY))
      .toEqual(expect.objectContaining({ urgent: true, text: expect.stringMatching(/^On rent, overdue since .*13$/) }))
  })
})

describe('NextBooking', () => {
  it('shows nothing, or the empty text, without a booking', () => {
    const { container, rerender } = render(<NextBooking next={undefined} />)
    expect(container).toBeEmptyDOMElement()

    rerender(<NextBooking next={undefined} emptyText="No upcoming bookings" />)
    expect(screen.getByText('No upcoming bookings')).toBeInTheDocument()
  })
})
