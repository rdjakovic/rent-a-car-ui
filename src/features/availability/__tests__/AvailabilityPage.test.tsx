import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import AvailabilityPage from '../AvailabilityPage'
import { listBranches, findAvailableCars } from '@/lib/api/queries'

// Mock the API functions
vi.mock('@/lib/api/queries', () => ({
  listBranches: vi.fn(),
  findAvailableCars: vi.fn(),
}))

const mockListBranches = listBranches as any
const mockFindAvailableCars = findAvailableCars as any

describe('AvailabilityPage', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })
    vi.clearAllMocks()

    // Mock API responses
    mockListBranches.mockResolvedValue({
      content: [{ id: 1, name: 'Main Branch', city: 'New York' }],
      totalPages: 1,
      number: 0,
    })

    mockFindAvailableCars.mockResolvedValue({
      content: [],
      totalPages: 0,
      number: 0,
    })
  })

  const renderWithQueryClient = (component: React.ReactElement) => {
    return render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          {component}
        </QueryClientProvider>
      </MemoryRouter>
    )
  }

  it('renders hero section with correct branding', () => {
    renderWithQueryClient(<AvailabilityPage />)

    expect(screen.getByText(/NextStep/)).toBeInTheDocument()
    expect(screen.getByText(/RentACar/)).toBeInTheDocument()
    expect(screen.getByText(/Your journey starts here/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /rent now/i })).toBeInTheDocument()
  })

  it('renders availability search form', () => {
    renderWithQueryClient(<AvailabilityPage />)

    expect(screen.getByText('Availability Search')).toBeInTheDocument()
    expect(screen.getByText('Branch')).toBeInTheDocument()
    expect(screen.getByText('Start date')).toBeInTheDocument()
    expect(screen.getByText('End date')).toBeInTheDocument()
    expect(screen.getByText('Category')).toBeInTheDocument()
    expect(screen.getByText('Transmission')).toBeInTheDocument()
    expect(screen.getByText('Fuel type')).toBeInTheDocument()
    expect(screen.getByText('Min seats')).toBeInTheDocument()
    expect(screen.getByText('Max daily price')).toBeInTheDocument()
  })

  it('shows search and reset buttons', () => {
    renderWithQueryClient(<AvailabilityPage />)

    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument()
  })

  it('shows results placeholder when not submitted', () => {
    renderWithQueryClient(<AvailabilityPage />)

    expect(screen.getByText('Enter criteria and click Search.')).toBeInTheDocument()
  })

  it('disables search button when required fields are empty', () => {
    renderWithQueryClient(<AvailabilityPage />)

    const searchButton = screen.getByRole('button', { name: /search/i })
    expect(searchButton).toBeDisabled()
  })

  it('shows results section', () => {
    renderWithQueryClient(<AvailabilityPage />)

    expect(screen.getByText('Results')).toBeInTheDocument()
  })

  it('has form inputs for all search criteria', () => {
    renderWithQueryClient(<AvailabilityPage />)

    // Check for date inputs
    const dateInputs = screen.getAllByDisplayValue('')
    const dateInputsWithType = dateInputs.filter(input => input.getAttribute('type') === 'date')
    expect(dateInputsWithType).toHaveLength(2)

    // Check for number inputs
    const numberInputs = dateInputs.filter(input => input.getAttribute('type') === 'number')
    expect(numberInputs.length).toBeGreaterThanOrEqual(1)

    // Check for select dropdowns (comboboxes)
    const selectInputs = screen.getAllByRole('combobox')
    expect(selectInputs.length).toBeGreaterThanOrEqual(1)
  })
})
