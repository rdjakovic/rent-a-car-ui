import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import CarDetailsPage from '../CarDetailsPage'
import { getCarById, findAvailableCars, getSettings, listMaintenance } from '@/lib/api/queries'

vi.mock('@/lib/api/queries', () => ({
  getCarById: vi.fn(),
  findAvailableCars: vi.fn(),
  getSettings: vi.fn(),
  listMaintenance: vi.fn(),
  listCars: vi.fn(),
  scheduleMaintenance: vi.fn(),
}))

const mockGetCarById = getCarById as any
const mockFindAvailableCars = findAvailableCars as any
const mockGetSettings = getSettings as any

const car = {
  id: 7,
  vin: '1HGCM82633A004352',
  make: 'Toyota',
  model: 'Camry',
  year: 2023,
  category: 'INTERMEDIATE',
  transmission: 'AUTOMATIC',
  fuelType: 'GASOLINE',
  seats: 5,
  mileage: 12000,
  status: 'AVAILABLE',
  dailyPrice: 45,
  color: 'Silver',
  licensePlate: 'NY-1234',
  displayName: '2023 Toyota Camry',
  branch: { id: 3, name: 'Downtown Branch', address: '123 Main Street', city: 'New York', country: 'USA' },
}

function BookingTarget() {
  const location = useLocation()
  return <div data-testid="booking-wizard">{location.search}</div>
}

function renderAt(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/cars/:id" element={<CarDetailsPage />} />
          <Route path="/book" element={<BookingTarget />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

function pickDates(start: string, end: string) {
  fireEvent.change(screen.getByLabelText('Pickup date'), { target: { value: start } })
  fireEvent.change(screen.getByLabelText('Return date'), { target: { value: end } })
}

describe('CarDetailsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCarById.mockResolvedValue(car)
    mockGetSettings.mockResolvedValue({ mileageUnit: 'MILES' })
    ;(listMaintenance as any).mockResolvedValue({ content: [], totalElements: 0, totalPages: 0, number: 0 })
  })

  it('shows the car details and its branch', async () => {
    renderAt('/cars/7')

    expect(await screen.findByRole('heading', { name: '2023 Toyota Camry' })).toBeInTheDocument()
    expect(mockGetCarById).toHaveBeenCalledWith(7)
    expect(screen.getByText('1HGCM82633A004352')).toBeInTheDocument()
    expect(screen.getByText('NY-1234')).toBeInTheDocument()
    expect(screen.getByText('$45.00')).toBeInTheDocument()
    expect(screen.getByText('123 Main Street')).toBeInTheDocument()
    expect(await screen.findByText(`${(12000).toLocaleString()} mi`)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Back to catalog/ })).toHaveAttribute('href', '/cars')
  })

  it("shows the car's maintenance history", async () => {
    ;(listMaintenance as any).mockResolvedValue({
      content: [{ id: 3, description: 'Oil change', maintenanceType: 'ROUTINE', status: 'COMPLETED',
        scheduledDate: '2026-01-10', completedDate: '2026-01-10', cost: 129.9, currency: 'USD' }],
      totalElements: 1, totalPages: 1, number: 0,
    })

    renderAt('/cars/7')

    expect(await screen.findByRole('link', { name: 'Oil change' })).toHaveAttribute('href', '/maintenance/3')
    expect(listMaintenance).toHaveBeenCalledWith({ carId: 7, page: 0, size: 5 })
    expect(screen.getByRole('button', { name: 'Schedule maintenance' })).toBeInTheDocument()
  })

  it('shows a not-found message when the car cannot be loaded', async () => {
    mockGetCarById.mockRejectedValue({ message: 'Car not found' })

    renderAt('/cars/999')

    expect(await screen.findByText('Car not found')).toBeInTheDocument()
  })

  it('continues to the booking wizard when the car is free for the dates', async () => {
    mockFindAvailableCars.mockResolvedValue({ content: [{ id: 7 }], totalPages: 1, number: 0 })

    renderAt('/cars/7')
    await screen.findByRole('heading', { name: '2023 Toyota Camry' })
    pickDates('2099-01-10', '2099-01-10')
    fireEvent.click(screen.getByRole('button', { name: 'Book this car' }))

    const target = await screen.findByTestId('booking-wizard')
    const params = new URLSearchParams(target.textContent ?? '')
    expect(params.get('carId')).toBe('7')
    expect(params.get('branchId')).toBe('3')
    expect(params.get('startDate')).toBe('2099-01-10')
    expect(params.get('endDate')).toBe('2099-01-10')
    expect(params.get('dailyPrice')).toBe('45')
    expect(mockFindAvailableCars).toHaveBeenCalledWith(expect.objectContaining({
      branchId: 3, startDate: '2099-01-10', endDate: '2099-01-10',
    }))
  })

  it('tells the user when the car is already booked for the dates', async () => {
    mockFindAvailableCars.mockResolvedValue({ content: [{ id: 8 }], totalPages: 1, number: 0 })

    renderAt('/cars/7')
    await screen.findByRole('heading', { name: '2023 Toyota Camry' })
    pickDates('2099-01-10', '2099-01-12')
    fireEvent.click(screen.getByRole('button', { name: 'Book this car' }))

    expect(await screen.findByText('Not available')).toBeInTheDocument()
    expect(screen.queryByTestId('booking-wizard')).not.toBeInTheDocument()
  })

  it('rejects a return date before the pickup date', async () => {
    renderAt('/cars/7')
    await screen.findByRole('heading', { name: '2023 Toyota Camry' })
    pickDates('2099-01-12', '2099-01-10')

    expect(screen.getByText('Return date cannot be before pickup date')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Book this car' })).toBeDisabled()
  })

  it('does not offer booking for a car that is not available', async () => {
    mockGetCarById.mockResolvedValue({ ...car, status: 'MAINTENANCE' })

    renderAt('/cars/7')

    expect(await screen.findByText(/can't be booked right now/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Book this car' })).not.toBeInTheDocument()
  })
})
