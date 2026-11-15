import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import CarsPage from '../CarsPage'
import { listCars } from '@/lib/api/queries'

vi.mock('@/lib/api/queries', () => ({
  listCars: vi.fn(),
  createCar: vi.fn(),
  getSettings: vi.fn(),
  listBranches: vi.fn(),
}))

function renderPage() {
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
})
