import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import MaintenancePage from '../MaintenancePage'
import { daysFromToday } from '@/lib/dates'
import { signInAs, type TestRole } from '@/test/authUsers'
import {
  getSettings,
  listBranches,
  listCars,
  listCarsDueForService,
  listMaintenance,
  scheduleMaintenance,
} from '@/lib/api/queries'

vi.mock('@/lib/api/queries', () => ({
  getSettings: vi.fn(),
  listBranches: vi.fn(),
  listCars: vi.fn(),
  listCarsDueForService: vi.fn(),
  listMaintenance: vi.fn(),
  scheduleMaintenance: vi.fn(),
}))

const mockListMaintenance = listMaintenance as any
const mockDueCars = listCarsDueForService as any
const mockSchedule = scheduleMaintenance as any

const car = { id: 4, displayName: '2022 Toyota Prius', branchName: 'Downtown' }

const jobs = [
  { id: 1, car, maintenanceType: 'INSPECTION', description: 'Annual safety inspection',
    scheduledDate: daysFromToday(-2), status: 'SCHEDULED', cost: 60, currency: 'USD' },
  { id: 2, car, maintenanceType: 'RECALL', description: 'Airbag recall',
    scheduledDate: daysFromToday(3), status: 'SCHEDULED', currency: 'USD' },
  { id: 3, car, maintenanceType: 'ROUTINE', description: 'Oil change',
    scheduledDate: daysFromToday(-30), completedDate: daysFromToday(-30), status: 'COMPLETED', cost: 129.9, currency: 'USD' },
]

/** Counts are one-row pages; answer them by filter, the job list gets all jobs. */
function maintenanceResponse(params: any) {
  if (params.size === 1) {
    const counts: Record<string, number> = { IN_PROGRESS: 1, SCHEDULED: 2 }
    const total = params.maintenanceType === 'RECALL'
      ? (params.status === 'SCHEDULED' ? 1 : 0)
      : counts[params.status] ?? 0
    return { content: [], totalElements: total, totalPages: total, number: 0 }
  }
  return { content: jobs, totalElements: jobs.length, totalPages: 1, number: 0 }
}

function renderPage(role: TestRole = 'STAFF') {
  signInAs(role)
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <MaintenancePage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('MaintenancePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(getSettings as any).mockResolvedValue({ mileageUnit: 'MILES' })
    ;(listBranches as any).mockResolvedValue({ content: [{ id: 1, name: 'Downtown' }] })
    ;(listCars as any).mockResolvedValue({ content: [] })
    mockListMaintenance.mockImplementation(async (params: any) => maintenanceResponse(params))
    mockDueCars.mockResolvedValue([
      { id: 7, displayName: '2023 BMW Z4', licensePlate: 'BMW-Z4002', mileage: 4000,
        nextServiceDate: daysFromToday(-3), branch: { name: 'Uptown' } },
    ])
  })

  it('shows the overview counts, cars due for service and the jobs', async () => {
    renderPage()

    expect(await screen.findByText('Annual safety inspection')).toBeInTheDocument()
    const inProgress = screen.getByRole('button', { name: /In progress/ })
    await waitFor(() => expect(within(inProgress).getByText('1')).toBeInTheDocument())
    expect(within(screen.getByRole('button', { name: /Open recalls/ })).getByText('1')).toBeInTheDocument()

    // Due for service, with the configured mileage unit
    expect(await screen.findByText('2023 BMW Z4')).toBeInTheDocument()
    expect(screen.getByText(/4,000 mi/)).toBeInTheDocument()

    // The past scheduled job is flagged as overdue, the completed one is not
    const overdueRow = screen.getByText('Annual safety inspection').closest('tr')!
    expect(within(overdueRow).getByText('Overdue')).toBeInTheDocument()
    expect(within(screen.getByText('Oil change').closest('tr')!).queryByText('Overdue')).not.toBeInTheDocument()
    expect(within(screen.getByText('Airbag recall').closest('tr')!).getByLabelText('Open recall')).toBeInTheDocument()

    expect(within(overdueRow).getByRole('link', { name: 'View' })).toHaveAttribute('href', '/maintenance/1')
  })

  it('filters the job list when an overview card is clicked', async () => {
    renderPage()
    await screen.findByText('Annual safety inspection')

    fireEvent.click(screen.getByRole('button', { name: /Overdue/ }))

    await waitFor(() => expect(mockListMaintenance).toHaveBeenCalledWith(
      { page: 0, size: 10, status: 'SCHEDULED', endDate: daysFromToday(-1) }))
  })

  it('schedules a routine service for a car that is due', async () => {
    mockSchedule.mockResolvedValue({ id: 10 })
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: 'Schedule' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('2023 BMW Z4')).toBeInTheDocument()

    fireEvent.change(within(dialog).getByLabelText('Scheduled date'), { target: { value: daysFromToday(2) } })
    fireEvent.change(within(dialog).getByLabelText('Description'), { target: { value: 'Oil service' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Schedule' }))

    await waitFor(() => expect(mockSchedule).toHaveBeenCalledWith({
      carId: 7, type: 'ROUTINE', description: 'Oil service', scheduledDate: daysFromToday(2),
      cost: undefined, notes: undefined,
    }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('shows why the backend rejected a schedule', async () => {
    mockSchedule.mockRejectedValue({ status: 409, detail: 'Car has a reservation on 2099-01-01; pick another date' })
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: 'Schedule' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('Scheduled date'), { target: { value: daysFromToday(2) } })
    fireEvent.change(within(dialog).getByLabelText('Description'), { target: { value: 'Oil service' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Schedule' }))

    expect(await within(dialog).findByText(/Car has a reservation/)).toBeInTheDocument()
  })

  it('does not allow scheduling in the past', async () => {
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: 'Schedule' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('Scheduled date'), { target: { value: daysFromToday(-1) } })
    fireEvent.change(within(dialog).getByLabelText('Description'), { target: { value: 'Oil service' } })

    expect(within(dialog).getByText('Scheduled date cannot be in the past')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Schedule' })).toBeDisabled()
  })
})
