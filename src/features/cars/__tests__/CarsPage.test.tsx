import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import CarsPage from '../CarsPage'
import { getSettings, listBranches, listCars } from '@/lib/api/queries'
import { signInAs, type TestRole } from '@/test/authUsers'

vi.mock('@/lib/api/queries', () => ({
  listCars: vi.fn(),
  createCar: vi.fn(),
  getSettings: vi.fn(),
  listBranches: vi.fn(),
  uploadCarImages: vi.fn(),
  carImageUrl: (url: string) => url,
}))

function renderPage(role: TestRole = 'MANAGER') {
  signInAs(role)
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CarsPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('CarsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(getSettings as any).mockResolvedValue({ mileageUnit: 'KILOMETERS' })
    ;(listBranches as any).mockResolvedValue({ content: [] })
    ;(listCars as any).mockResolvedValue({
      content: [{ id: 1, displayName: '2023 Toyota Camry', category: 'INTERMEDIATE', status: 'AVAILABLE', seats: 5, fuelType: 'GASOLINE', transmission: 'AUTOMATIC', dailyPrice: 45 }],
      number: 0, totalPages: 1,
    })
  })

  it('lists cars and opens the add-car dialog', async () => {
    renderPage()

    expect(await screen.findByText('2023 Toyota Camry')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Add car/ }))

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Add a car' })).toBeInTheDocument()
  })

  it('filters by make, model and year, and combines them with the search', async () => {
    renderPage()
    await screen.findByText('2023 Toyota Camry')

    fireEvent.change(screen.getByPlaceholderText('e.g. Toyota'), { target: { value: 'toy' } })
    await waitFor(() => expect(listCars).toHaveBeenLastCalledWith(expect.objectContaining({ make: 'toy', page: 0 })))

    fireEvent.change(screen.getByPlaceholderText('e.g. Camry'), { target: { value: 'cam' } })
    await waitFor(() => expect(listCars).toHaveBeenLastCalledWith(expect.objectContaining({ make: 'toy', model: 'cam' })))

    fireEvent.change(screen.getByPlaceholderText('e.g. 2023'), { target: { value: '2023' } })
    await waitFor(() => expect(listCars).toHaveBeenLastCalledWith(expect.objectContaining({ make: 'toy', model: 'cam', year: 2023 })))

    // The free-text search still works alongside them
    fireEvent.change(screen.getByPlaceholderText('Car name, make, model...'), { target: { value: 'silver' } })
    await waitFor(() => expect(listCars).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: 'silver', make: 'toy', model: 'cam', year: 2023 })))
  })

  it('applies the year and the VIN only when complete', async () => {
    renderPage()
    await screen.findByText('2023 Toyota Camry')

    fireEvent.change(screen.getByPlaceholderText('e.g. 2023'), { target: { value: '20' } })
    fireEvent.change(screen.getByPlaceholderText('Full 17-character VIN'), { target: { value: '1hgbh41j' } })

    expect(screen.getByText('Enter all 17 characters to search by VIN')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Full 17-character VIN')).toHaveValue('1HGBH41J')
    expect(listCars).not.toHaveBeenCalledWith(expect.objectContaining({ year: expect.anything() }))
    expect(listCars).not.toHaveBeenCalledWith(expect.objectContaining({ vin: expect.anything() }))

    fireEvent.change(screen.getByPlaceholderText('Full 17-character VIN'), { target: { value: '1hgbh41jxmn109186' } })
    await waitFor(() => expect(listCars).toHaveBeenLastCalledWith(expect.objectContaining({ vin: '1HGBH41JXMN109186' })))
    expect(screen.queryByText('Enter all 17 characters to search by VIN')).not.toBeInTheDocument()
  })

  it('hides Add car from staff', async () => {
    renderPage('STAFF')

    expect(await screen.findByText('2023 Toyota Camry')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Add car/ })).not.toBeInTheDocument()
  })

  it('keeps only digits in the year and clears every filter', async () => {
    renderPage()
    await screen.findByText('2023 Toyota Camry')

    fireEvent.change(screen.getByPlaceholderText('e.g. 2023'), { target: { value: '2a0b23' } })
    expect(screen.getByPlaceholderText('e.g. 2023')).toHaveValue('2023')

    fireEvent.change(screen.getByPlaceholderText('e.g. Toyota'), { target: { value: 'toy' } })
    // The search boxes apply their value after a short debounce
    await waitFor(() => expect(listCars).toHaveBeenLastCalledWith(expect.objectContaining({ make: 'toy', year: 2023 })))
    fireEvent.click(await screen.findByRole('button', { name: 'Clear All Filters' }))

    expect(screen.getByPlaceholderText('e.g. 2023')).toHaveValue('')
    await waitFor(() => expect(screen.getByPlaceholderText('e.g. Toyota')).toHaveValue(''))
  })
})
