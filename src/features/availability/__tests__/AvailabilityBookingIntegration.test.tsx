import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import AvailabilityPage from '../AvailabilityPage'
import { listBranches, findAvailableCars } from '@/lib/api/queries'

// Mock the API functions
vi.mock('@/lib/api/queries', () => ({
  listBranches: vi.fn(),
  findAvailableCars: vi.fn(),
}))

// Mock react-router-dom navigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

const mockListBranches = listBranches as any
const mockFindAvailableCars = findAvailableCars as any

describe('AvailabilityPage - Booking Integration', () => {
  let queryClient: QueryClient

  const mockBranches = {
    content: [
      { id: 1, name: 'Main Branch', city: 'New York' },
      { id: 2, name: 'Airport Branch', city: 'Los Angeles' }
    ],
    totalPages: 1,
    number: 0,
  }

  const mockAvailableCars = {
    content: [
      {
        id: 101,
        displayName: 'Toyota Camry 2024',
        category: 'INTERMEDIATE',
        transmission: 'AUTOMATIC',
        fuelType: 'GASOLINE',
        seats: 5,
        dailyPrice: 45.99,
        branchName: 'Main Branch',
        color: 'Silver',
        status: 'AVAILABLE'
      },
      {
        id: 102,
        displayName: 'Honda Civic 2023',
        category: 'COMPACT',
        transmission: 'MANUAL',
        fuelType: 'GASOLINE',
        seats: 5,
        dailyPrice: 35.50,
        branchName: 'Main Branch',
        color: 'Blue',
        status: 'AVAILABLE'
      }
    ],
    totalPages: 1,
    number: 0,
  }

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
    mockListBranches.mockResolvedValue(mockBranches)
    mockFindAvailableCars.mockResolvedValue(mockAvailableCars)
  })

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          {component}
        </QueryClientProvider>
      </BrowserRouter>
    )
  }

  it('displays Book buttons for available cars', async () => {
    renderWithProviders(<AvailabilityPage />)

    // Fill in required search criteria - find the first combobox (branch select)
    const comboboxes = screen.getAllByRole('combobox')
    const branchSelect = comboboxes[0] // First combobox is the branch select
    fireEvent.click(branchSelect)

    await waitFor(() => {
      const branchOption = screen.getByText('Main Branch (New York)')
      fireEvent.click(branchOption)
    })

    const startDateInput = screen.getByLabelText(/start date/i)
    const endDateInput = screen.getByLabelText(/end date/i)

    fireEvent.change(startDateInput, { target: { value: '2024-12-01' } })
    fireEvent.change(endDateInput, { target: { value: '2024-12-05' } })

    // Submit search
    const searchButton = screen.getByRole('button', { name: /search/i })
    fireEvent.click(searchButton)

    // Wait for results to load
    await waitFor(() => {
      expect(screen.getByText('Toyota Camry 2024')).toBeInTheDocument()
      expect(screen.getByText('Honda Civic 2023')).toBeInTheDocument()
    })

    // Check that Book buttons are present
    const bookButtons = screen.getAllByRole('button', { name: /book/i })
    expect(bookButtons).toHaveLength(2)
  })

  it('navigates to booking flow with correct parameters when Book button is clicked', async () => {
    renderWithProviders(<AvailabilityPage />)

    // Fill in search criteria - find the first combobox (branch select)
    const comboboxes = screen.getAllByRole('combobox')
    const branchSelect = comboboxes[0] // First combobox is the branch select
    fireEvent.click(branchSelect)

    await waitFor(() => {
      const branchOption = screen.getByText('Main Branch (New York)')
      fireEvent.click(branchOption)
    })

    const startDateInput = screen.getByLabelText(/start date/i)
    const endDateInput = screen.getByLabelText(/end date/i)

    fireEvent.change(startDateInput, { target: { value: '2024-12-01' } })
    fireEvent.change(endDateInput, { target: { value: '2024-12-05' } })

    // Submit search
    const searchButton = screen.getByRole('button', { name: /search/i })
    fireEvent.click(searchButton)

    // Wait for results and click first Book button
    await waitFor(() => {
      const bookButtons = screen.getAllByRole('button', { name: /book/i })
      fireEvent.click(bookButtons[0])
    })

    // Verify navigation was called with correct parameters
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.stringContaining('/book?')
    )

    const navigationCall = mockNavigate.mock.calls[0][0]
    const url = new URL(navigationCall, 'http://localhost')
    const params = url.searchParams

    expect(params.get('carId')).toBe('101')
    expect(params.get('branchId')).toBe('1')
    expect(params.get('startDate')).toBe('2024-12-01')
    expect(params.get('endDate')).toBe('2024-12-05')
    expect(params.get('dailyPrice')).toBe('45.99')
    expect(params.get('carDisplayName')).toBe('Toyota Camry 2024')
    expect(params.get('carCategory')).toBe('INTERMEDIATE')
    expect(params.get('branchName')).toBe('Main Branch')
  })

  it('passes correct car details for different cars', async () => {
    renderWithProviders(<AvailabilityPage />)

    // Fill in search criteria - find the first combobox (branch select)
    const comboboxes = screen.getAllByRole('combobox')
    const branchSelect = comboboxes[0] // First combobox is the branch select
    fireEvent.click(branchSelect)

    await waitFor(() => {
      const branchOption = screen.getByText('Main Branch (New York)')
      fireEvent.click(branchOption)
    })

    const startDateInput = screen.getByLabelText(/start date/i)
    const endDateInput = screen.getByLabelText(/end date/i)

    fireEvent.change(startDateInput, { target: { value: '2024-12-01' } })
    fireEvent.change(endDateInput, { target: { value: '2024-12-05' } })

    // Submit search
    const searchButton = screen.getByRole('button', { name: /search/i })
    fireEvent.click(searchButton)

    // Wait for results and click second Book button (Honda Civic)
    await waitFor(() => {
      const bookButtons = screen.getAllByRole('button', { name: /book/i })
      fireEvent.click(bookButtons[1])
    })

    // Verify navigation was called with Honda Civic details
    const navigationCall = mockNavigate.mock.calls[0][0]
    const url = new URL(navigationCall, 'http://localhost')
    const params = url.searchParams

    expect(params.get('carId')).toBe('102')
    expect(params.get('dailyPrice')).toBe('35.5')
    expect(params.get('carDisplayName')).toBe('Honda Civic 2023')
    expect(params.get('carCategory')).toBe('COMPACT')
  })

  it('encodes URL parameters correctly for special characters', async () => {
    // Mock car with special characters in name
    const mockCarsWithSpecialChars = {
      content: [
        {
          id: 103,
          displayName: 'BMW X5 M-Sport & Luxury',
          category: 'LUXURY',
          transmission: 'AUTOMATIC',
          fuelType: 'GASOLINE',
          seats: 5,
          dailyPrice: 125.75,
          branchName: 'Downtown & Airport',
          color: 'Black',
          status: 'AVAILABLE'
        }
      ],
      totalPages: 1,
      number: 0,
    }

    mockFindAvailableCars.mockResolvedValue(mockCarsWithSpecialChars)

    renderWithProviders(<AvailabilityPage />)

    // Fill in search criteria - find the first combobox (branch select)
    const comboboxes = screen.getAllByRole('combobox')
    const branchSelect = comboboxes[0] // First combobox is the branch select
    fireEvent.click(branchSelect)

    await waitFor(() => {
      const branchOption = screen.getByText('Main Branch (New York)')
      fireEvent.click(branchOption)
    })

    const startDateInput = screen.getByLabelText(/start date/i)
    const endDateInput = screen.getByLabelText(/end date/i)

    fireEvent.change(startDateInput, { target: { value: '2024-12-01' } })
    fireEvent.change(endDateInput, { target: { value: '2024-12-05' } })

    // Submit search
    const searchButton = screen.getByRole('button', { name: /search/i })
    fireEvent.click(searchButton)

    // Wait for results and click Book button
    await waitFor(() => {
      const bookButton = screen.getByRole('button', { name: /book/i })
      fireEvent.click(bookButton)
    })

    // Verify URL encoding
    const navigationCall = mockNavigate.mock.calls[0][0]
    // URLSearchParams encodes spaces as '+' by default (and '&' as %26)
    expect(navigationCall).toContain('carDisplayName=BMW+X5+M-Sport+%26+Luxury')
    expect(navigationCall).toContain('branchName=Downtown+%26+Airport')
  })

  it('handles missing optional car details gracefully', async () => {
    // Mock car with minimal details
    const mockMinimalCar = {
      content: [
        {
          id: 104,
          displayName: null, // Missing display name
          category: null, // Missing category
          transmission: 'AUTOMATIC',
          fuelType: 'GASOLINE',
          seats: 5,
          dailyPrice: 50.00,
          branchName: null, // Missing branch name
          color: 'Red',
          status: 'AVAILABLE'
        }
      ],
      totalPages: 1,
      number: 0,
    }

    mockFindAvailableCars.mockResolvedValue(mockMinimalCar)

    renderWithProviders(<AvailabilityPage />)

    // Fill in search criteria - find the first combobox (branch select)
    const comboboxes = screen.getAllByRole('combobox')
    const branchSelect = comboboxes[0] // First combobox is the branch select
    fireEvent.click(branchSelect)

    await waitFor(() => {
      const branchOption = screen.getByText('Main Branch (New York)')
      fireEvent.click(branchOption)
    })

    const startDateInput = screen.getByLabelText(/start date/i)
    const endDateInput = screen.getByLabelText(/end date/i)

    fireEvent.change(startDateInput, { target: { value: '2024-12-01' } })
    fireEvent.change(endDateInput, { target: { value: '2024-12-05' } })

    // Submit search
    const searchButton = screen.getByRole('button', { name: /search/i })
    fireEvent.click(searchButton)

    // Wait for results and click Book button
    await waitFor(() => {
      const bookButton = screen.getByRole('button', { name: /book/i })
      fireEvent.click(bookButton)
    })

    // Verify navigation still works with fallback values
    const navigationCall = mockNavigate.mock.calls[0][0]
    const url = new URL(navigationCall, 'http://localhost')
    const params = url.searchParams

    expect(params.get('carId')).toBe('104')
    expect(params.get('carDisplayName')).toBe('Unknown Car')
    expect(params.get('carCategory')).toBe('ECONOMY')
    expect(params.get('branchName')).toBe('Unknown Branch')
  })
})