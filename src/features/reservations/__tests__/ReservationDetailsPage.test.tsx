import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ReservationDetailsPage from '../ReservationDetailsPage'
import { confirmReservation, getReservationById, getSettings } from '@/lib/api/queries'

vi.mock('@/lib/api/queries', () => ({
  getReservationById: vi.fn(),
  confirmReservation: vi.fn(),
  cancelReservation: vi.fn(),
  getSettings: vi.fn(),
}))

const mockGetReservationById = getReservationById as any

const reservation = {
  id: 12,
  status: 'PENDING',
  startDate: '2099-03-01',
  endDate: '2099-03-04',
  durationDays: 3,
  dailyRate: 45,
  totalPrice: 135,
  currency: 'USD',
  customer: { id: 1, firstName: 'Alice', lastName: 'Johnson', fullName: 'Alice Johnson', email: 'alice@example.com' },
  car: { id: 7, displayName: '2023 Toyota Camry' },
  pickupBranch: { id: 1, name: 'Downtown Branch' },
  dropoffBranch: { id: 1, name: 'Downtown Branch' },
  createdAt: '2026-11-14T10:00:00Z',
}

function renderAt(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/reservations/:id" element={<ReservationDetailsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('ReservationDetailsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetReservationById.mockResolvedValue(reservation)
    ;(getSettings as any).mockResolvedValue({ mileageUnit: 'KILOMETERS' })
  })

  it('loads and shows the reservation', async () => {
    renderAt('/reservations/12')

    expect(await screen.findByRole('heading', { name: 'Reservation #12' })).toBeInTheDocument()
    expect(mockGetReservationById).toHaveBeenCalledWith(12)
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
    expect(screen.getByText('2023 Toyota Camry')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Back to reservations/ })).toHaveAttribute('href', '/reservations')
  })

  it('shows the updated reservation after an action', async () => {
    // Like the backend, the refetch that follows the action returns the confirmed reservation
    ;(confirmReservation as any).mockImplementation(async () => {
      const confirmed = { ...reservation, status: 'CONFIRMED' }
      mockGetReservationById.mockResolvedValue(confirmed)
      return confirmed
    })
    renderAt('/reservations/12')

    expect(await screen.findByText('Pending')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Confirm/ }))

    await waitFor(() => expect(confirmReservation).toHaveBeenCalledWith(12))
    expect(await screen.findByText('Confirmed')).toBeInTheDocument()
  })

  it('shows a not-found message', async () => {
    mockGetReservationById.mockRejectedValue(new Error('Reservation not found: 999'))
    renderAt('/reservations/999')

    expect(await screen.findByText('Reservation not found')).toBeInTheDocument()
  })

  it('rejects an invalid link without calling the API', async () => {
    renderAt('/reservations/abc')

    expect(await screen.findByText('This reservation link is not valid.')).toBeInTheDocument()
    expect(mockGetReservationById).not.toHaveBeenCalled()
  })
})
