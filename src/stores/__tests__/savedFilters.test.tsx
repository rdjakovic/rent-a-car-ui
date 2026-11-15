import { StrictMode } from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import AvailabilityPage from '@/features/availability/AvailabilityPage'
import CarsPage from '@/features/cars/CarsPage'
import CustomersPage from '@/features/customers/CustomersPage'
import ReservationsPage from '@/features/reservations/ReservationsPage'
import {
  createFilterStore,
  resetFilterStores,
  useAvailabilityFilters,
  useCarsFilters,
  useCustomersFilters,
  useFilterField,
  useReservationsFilters,
} from '../filterStore'
import { useResetPageOnChange } from '@/hooks/useResetPageOnChange'
import { daysFromToday } from '@/lib/dates'
import * as queries from '@/lib/api/queries'

vi.mock('@/lib/api/queries', () => ({
  listBranches: vi.fn(),
  findAvailableCars: vi.fn(),
  listCars: vi.fn(),
  createCar: vi.fn(),
  getSettings: vi.fn(),
  listCustomers: vi.fn(),
  createCustomer: vi.fn(),
  updateCustomer: vi.fn(),
  listReservations: vi.fn(),
  getReservationById: vi.fn(),
  confirmReservation: vi.fn(),
  cancelReservation: vi.fn(),
  completeReservation: vi.fn(),
  pickUpReservation: vi.fn(),
  getCarById: vi.fn(),
}))

const empty = { content: [], number: 0, totalPages: 0, totalElements: 0 }

function renderPage(page: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{page}</MemoryRouter>
      </QueryClientProvider>
    </StrictMode>
  )
}

describe('saved filter stores', () => {
  it('useFilterField works like useState, including updater functions', () => {
    const useStore = createFilterStore({ page: 0, search: '' })
    const { result } = renderHook(() => useFilterField(useStore, 'page'))

    act(() => result.current[1](3))
    expect(result.current[0]).toBe(3)
    act(() => result.current[1]((previous) => previous + 1))
    expect(result.current[0]).toBe(4)
    expect(useStore.getState()).toEqual({ page: 4, search: '' })

    useStore.reset()
    expect(useStore.getState().page).toBe(0)
  })

  it('resetFilterStores restores every page store', () => {
    useCarsFilters.setState({ search: 'camry', page: 2 })
    useCustomersFilters.setState({ search: 'smith' })
    useReservationsFilters.setState({ status: 'ACTIVE' })
    useAvailabilityFilters.setState({ branchId: '1', submitted: true })

    resetFilterStores()

    expect(useCarsFilters.getState()).toMatchObject({ search: '', page: 0 })
    expect(useCustomersFilters.getState().search).toBe('')
    expect(useReservationsFilters.getState().status).toBe('')
    expect(useAvailabilityFilters.getState()).toMatchObject({ branchId: '', submitted: false })
  })

  it('useResetPageOnChange resets on a filter change, not on mount (also in StrictMode)', () => {
    const setPage = vi.fn()
    const { rerender } = renderHook(({ filters }) => useResetPageOnChange(filters, setPage), {
      initialProps: { filters: ['a'] },
      wrapper: StrictMode,
    })
    expect(setPage).not.toHaveBeenCalled()

    rerender({ filters: ['a'] })
    expect(setPage).not.toHaveBeenCalled()

    rerender({ filters: ['b'] })
    expect(setPage).toHaveBeenCalledTimes(1)
    expect(setPage).toHaveBeenCalledWith(0)
  })
})

describe('Availability page keeps its search', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(queries.listBranches).mockResolvedValue({
      content: [
        { id: 1, name: 'Downtown Branch', city: 'New York', active: true },
        { id: 2, name: 'Old Harbor', city: 'Boston', active: false },
      ],
    } as any)
    vi.mocked(queries.findAvailableCars).mockResolvedValue({ ...empty } as any)
  })

  it('shows the saved search again and runs it', async () => {
    const start = daysFromToday(3)
    const end = daysFromToday(5)
    useAvailabilityFilters.setState({ branchId: '1', startDate: start, endDate: end, category: 'SUV', submitted: true })

    renderPage(<AvailabilityPage />)

    expect(screen.getByDisplayValue(start)).toBeInTheDocument()
    expect(screen.getByDisplayValue(end)).toBeInTheDocument()
    await waitFor(() => expect(queries.findAvailableCars).toHaveBeenCalledWith(
      expect.objectContaining({ branchId: 1, startDate: start, endDate: end, category: 'SUV', page: 0 })))
  })

  it('keeps the saved page instead of jumping back to the first', async () => {
    useAvailabilityFilters.setState({ branchId: '1', startDate: daysFromToday(3), endDate: daysFromToday(5), submitted: true, page: 2 })

    renderPage(<AvailabilityPage />)

    await waitFor(() => expect(queries.findAvailableCars).toHaveBeenCalledWith(expect.objectContaining({ page: 2 })))
    expect(useAvailabilityFilters.getState().page).toBe(2)
  })

  it('drops a saved branch that has been closed', async () => {
    useAvailabilityFilters.setState({ branchId: '2', startDate: daysFromToday(3), endDate: daysFromToday(5), submitted: true })

    renderPage(<AvailabilityPage />)

    await waitFor(() => expect(useAvailabilityFilters.getState().branchId).toBe(''))
    expect(useAvailabilityFilters.getState().submitted).toBe(false)
    expect(queries.findAvailableCars).not.toHaveBeenCalled()
  })

  it('drops saved dates that have passed', async () => {
    useAvailabilityFilters.setState({ branchId: '1', startDate: daysFromToday(-2), endDate: daysFromToday(1), submitted: true })

    renderPage(<AvailabilityPage />)

    await waitFor(() => expect(useAvailabilityFilters.getState().startDate).toBe(''))
    expect(useAvailabilityFilters.getState()).toMatchObject({ endDate: '', submitted: false, branchId: '1' })
    expect(queries.findAvailableCars).not.toHaveBeenCalled()
  })

  it('Reset clears the saved search', async () => {
    useAvailabilityFilters.setState({ branchId: '1', startDate: daysFromToday(3), endDate: daysFromToday(5), category: 'SUV', submitted: true })

    renderPage(<AvailabilityPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))

    expect(useAvailabilityFilters.getState()).toMatchObject({ branchId: '', startDate: '', endDate: '', category: '', submitted: false })
  })
})

describe('Cars page keeps its filters', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(queries.listCars).mockResolvedValue({ ...empty } as any)
  })

  it('shows the saved search and page, and goes back to page 1 only when a filter changes', async () => {
    useCarsFilters.setState({ search: 'camry', category: 'SUV', page: 2 })

    renderPage(<CarsPage />)

    expect(screen.getByPlaceholderText('Car name, make, model...')).toHaveValue('camry')
    await waitFor(() => expect(queries.listCars).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'camry', category: 'SUV', page: 2 })))

    fireEvent.change(screen.getByPlaceholderText('Car name, make, model...'), { target: { value: 'civic' } })
    await waitFor(() => expect(useCarsFilters.getState()).toMatchObject({ search: 'civic', page: 0 }))
  })
})

describe('Customers page keeps its search', () => {
  it('shows the saved search and page', async () => {
    vi.clearAllMocks()
    vi.mocked(queries.listCustomers).mockResolvedValue({ ...empty } as any)
    useCustomersFilters.setState({ search: 'smith', page: 1 })

    renderPage(<CustomersPage />)

    expect(screen.getByPlaceholderText('Search by name, email, phone, city...')).toHaveValue('smith')
    await waitFor(() => expect(queries.listCustomers).toHaveBeenCalledWith({ search: 'smith', page: 1, size: 10 }))
  })
})

describe('Reservations page keeps its filters', () => {
  it('shows the saved filters and page', async () => {
    vi.clearAllMocks()
    vi.mocked(queries.listReservations).mockResolvedValue({ ...empty } as any)
    useReservationsFilters.setState({ search: 'alice', status: 'ACTIVE', startDate: '2026-12-01', page: 1 })

    renderPage(<ReservationsPage />)

    expect(screen.getByPlaceholderText('Customer, car, branch or reservation ID...')).toHaveValue('alice')
    expect(screen.getByDisplayValue('2026-12-01')).toBeInTheDocument()
    await waitFor(() => expect(queries.listReservations).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'alice', status: 'ACTIVE', startDate: '2026-12-01', page: 1 })))
  })
})
