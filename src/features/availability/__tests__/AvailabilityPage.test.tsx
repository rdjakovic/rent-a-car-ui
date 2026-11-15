import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import AvailabilityPage from '../AvailabilityPage'
import { listBranches, findAvailableCars, getSettings } from '@/lib/api/queries'
import { todayString } from '@/lib/dates'

// Mock the API functions
vi.mock('@/lib/api/queries', () => ({
  listBranches: vi.fn(),
  findAvailableCars: vi.fn(),
  getSettings: vi.fn(),
}))

const mockListBranches = listBranches as any
const mockFindAvailableCars = findAvailableCars as any
const mockGetSettings = getSettings as any

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
    mockGetSettings.mockResolvedValue({ mileageUnit: 'KILOMETERS' })
    mockListBranches.mockResolvedValue({
      content: [
        { id: 1, name: 'Main Branch', city: 'New York', active: true },
        { id: 2, name: 'Closed Branch', city: 'Boston', active: false },
      ],
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
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          {component}
        </QueryClientProvider>
      </BrowserRouter>
    )
  }

  it('renders hero section with correct branding', () => {
    renderWithQueryClient(<AvailabilityPage />)
    
    expect(screen.getByText(/NextStep/)).toBeInTheDocument()
    expect(screen.getByText(/RentACar/)).toBeInTheDocument()
    expect(screen.getByText(/Your journey starts here/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /rent now/i })).not.toBeInTheDocument()
  })

  it('offers only active branches for booking', async () => {
    renderWithQueryClient(<AvailabilityPage />)

    // The first combobox is the branch select
    fireEvent.click(screen.getAllByRole('combobox')[0])

    expect(await screen.findByText('Main Branch (New York)')).toBeInTheDocument()
    expect(screen.queryByText(/Closed Branch/)).not.toBeInTheDocument()
  })

  it('pre-selects today as the start date', () => {
    renderWithQueryClient(<AvailabilityPage />)

    expect(screen.getByLabelText('Start date')).toHaveValue(todayString())
    expect(screen.getByLabelText('End date')).toHaveValue('')
  })

  it('pre-selects the default branch from the settings', async () => {
    mockGetSettings.mockResolvedValue({ mileageUnit: 'KILOMETERS', defaultBranchId: 1 })
    renderWithQueryClient(<AvailabilityPage />)

    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Branch' })).toHaveTextContent('Main Branch (New York)'))
  })

  it('pre-selects nothing when there is no default branch or it has been closed', async () => {
    mockGetSettings.mockResolvedValue({ mileageUnit: 'KILOMETERS', defaultBranchId: 2 })
    renderWithQueryClient(<AvailabilityPage />)

    await waitFor(() => expect(mockGetSettings).toHaveBeenCalled())
    await screen.findByRole('combobox', { name: 'Branch' })
    expect(screen.getByRole('combobox', { name: 'Branch' })).toHaveTextContent('Select branch')
  })

  it('Reset brings back the default branch and today', async () => {
    mockGetSettings.mockResolvedValue({ mileageUnit: 'KILOMETERS', defaultBranchId: 1 })
    renderWithQueryClient(<AvailabilityPage />)
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Branch' })).toHaveTextContent('Main Branch'))

    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2030-01-01' } })
    fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2030-01-05' } })
    fireEvent.click(screen.getByRole('button', { name: /reset/i }))

    expect(screen.getByLabelText('Start date')).toHaveValue(todayString())
    expect(screen.getByLabelText('End date')).toHaveValue('')
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Branch' })).toHaveTextContent('Main Branch'))
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
    
    // Check for date inputs (the start date is pre-selected as today, the end date is empty)
    const dateInputs = screen.getAllByDisplayValue('')
    const dateInputsWithType = dateInputs.filter(input => input.getAttribute('type') === 'date')
    expect(dateInputsWithType).toHaveLength(1)
    
    // Check for number inputs
    const numberInputs = dateInputs.filter(input => input.getAttribute('type') === 'number')
    expect(numberInputs.length).toBeGreaterThanOrEqual(1)
    
    // Check for select dropdowns (comboboxes)
    const selectInputs = screen.getAllByRole('combobox')
    expect(selectInputs.length).toBeGreaterThanOrEqual(1)
  })
})
