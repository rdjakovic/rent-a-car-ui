import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import MaintenanceDetailsPage from '../MaintenanceDetailsPage'
import { daysFromToday } from '@/lib/dates'
import {
  cancelMaintenance,
  completeMaintenance,
  getCarById,
  getMaintenance,
  getSettings,
  startMaintenance,
} from '@/lib/api/queries'

vi.mock('@/lib/api/queries', () => ({
  cancelMaintenance: vi.fn(),
  completeMaintenance: vi.fn(),
  getCarById: vi.fn(),
  getMaintenance: vi.fn(),
  getSettings: vi.fn(),
  listCars: vi.fn(),
  scheduleMaintenance: vi.fn(),
  startMaintenance: vi.fn(),
  updateMaintenance: vi.fn(),
}))

const mockGetMaintenance = getMaintenance as any

const job = {
  id: 5, car: { id: 8, displayName: '2024 Land Rover Range Rover' }, maintenanceType: 'RECALL',
  description: 'Airbag inflator replacement', scheduledDate: daysFromToday(3), status: 'SCHEDULED',
  cost: 0, currency: 'USD', notes: 'Free at the dealer',
}
const car = {
  id: 8, displayName: '2024 Land Rover Range Rover', licensePlate: 'LRR-9003', mileage: 6000,
  status: 'AVAILABLE', branch: { name: 'Uptown' }, nextServiceDate: daysFromToday(60),
}

/** The backend now returns the updated job, also to the refetch that follows the action. */
function resolveAfterAction(updated: object) {
  mockGetMaintenance.mockResolvedValue(updated)
  return updated
}

function renderAt(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/maintenance/:id" element={<MaintenanceDetailsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('MaintenanceDetailsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetMaintenance.mockResolvedValue(job)
    ;(getCarById as any).mockResolvedValue(car)
    ;(getSettings as any).mockResolvedValue({ mileageUnit: 'KILOMETERS' })
  })

  it('shows the job, the car and the recall warning', async () => {
    renderAt('/maintenance/5')

    expect(await screen.findByRole('heading', { name: 'Airbag inflator replacement' })).toBeInTheDocument()
    expect(mockGetMaintenance).toHaveBeenCalledWith(5)
    expect(screen.getByText('Open safety recall')).toBeInTheDocument()
    expect(screen.getByText('Free at the dealer')).toBeInTheDocument()
    expect(await screen.findByText('LRR-9003')).toBeInTheDocument()
    expect(await screen.findByText(`${(6000).toLocaleString()} km`)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '2024 Land Rover Range Rover' })).toHaveAttribute('href', '/cars/8')
  })

  it('starts a scheduled job', async () => {
    ;(startMaintenance as any).mockImplementation(async () => resolveAfterAction({ ...job, status: 'IN_PROGRESS' }))
    renderAt('/maintenance/5')

    fireEvent.click(await screen.findByRole('button', { name: 'Start job' }))

    await waitFor(() => expect(startMaintenance).toHaveBeenCalledWith(5))
    expect(await screen.findByRole('button', { name: 'Complete job' })).toBeInTheDocument()
  })

  it('completes a job with cost, odometer and next service date', async () => {
    mockGetMaintenance.mockResolvedValue({ ...job, maintenanceType: 'ROUTINE', status: 'IN_PROGRESS' })
    ;(completeMaintenance as any).mockImplementation(async () => resolveAfterAction({ ...job, status: 'COMPLETED' }))
    renderAt('/maintenance/5')
    await screen.findByText('LRR-9003')

    fireEvent.click(await screen.findByRole('button', { name: 'Complete job' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByLabelText('Odometer (km)')).toHaveValue(6000)

    // The odometer can't go backwards
    fireEvent.change(within(dialog).getByLabelText('Odometer (km)'), { target: { value: '5999' } })
    expect(within(dialog).getByText(/can't be lower than the car's recorded mileage/)).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Complete job' })).toBeDisabled()

    fireEvent.change(within(dialog).getByLabelText('Odometer (km)'), { target: { value: '6150' } })
    fireEvent.change(within(dialog).getByLabelText('Final cost (USD)'), { target: { value: '149.90' } })
    fireEvent.change(within(dialog).getByLabelText('Next service due'), { target: { value: daysFromToday(180) } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Complete job' }))

    await waitFor(() => expect(completeMaintenance).toHaveBeenCalledWith(5, {
      cost: 149.9, odometerReading: 6150, notes: 'Free at the dealer', nextServiceDate: daysFromToday(180),
    }))
    expect(await screen.findByText('This job is completed.')).toBeInTheDocument()
  })

  it('cancels a job after confirmation', async () => {
    ;(cancelMaintenance as any).mockImplementation(async () => resolveAfterAction({ ...job, status: 'CANCELLED' }))
    renderAt('/maintenance/5')

    fireEvent.click(await screen.findByRole('button', { name: 'Cancel job' }))
    const dialog = await screen.findByRole('dialog')
    expect(cancelMaintenance).not.toHaveBeenCalled()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel job' }))

    await waitFor(() => expect(cancelMaintenance).toHaveBeenCalledWith(5))
    expect(await screen.findByText('This job is cancelled.')).toBeInTheDocument()
  })

  it('shows a not-found message', async () => {
    mockGetMaintenance.mockRejectedValue({ status: 404, detail: 'Maintenance not found: 999' })
    renderAt('/maintenance/999')

    expect(await screen.findByText('Maintenance job not found')).toBeInTheDocument()
  })
})
