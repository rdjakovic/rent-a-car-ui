import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/toaster'
import SettingsPage from '../SettingsPage'
import { getSettings, updateSettings } from '@/lib/api/queries'

vi.mock('@/lib/api/queries', () => ({
  getSettings: vi.fn(),
  updateSettings: vi.fn(),
}))

const mockGetSettings = getSettings as any
const mockUpdateSettings = updateSettings as any

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <SettingsPage />
      <Toaster />
    </QueryClientProvider>
  )
}

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSettings.mockResolvedValue({ mileageUnit: 'KILOMETERS' })
  })

  it('shows the saved mileage unit and only enables Save after a change', async () => {
    renderPage()

    expect(await screen.findByRole('radio', { name: 'Kilometers (km)' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Miles (mi)' })).not.toBeChecked()
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()

    fireEvent.click(screen.getByRole('radio', { name: 'Miles (mi)' }))

    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled()
  })

  it('saves the new mileage unit', async () => {
    mockUpdateSettings.mockResolvedValue({ mileageUnit: 'MILES' })
    renderPage()

    fireEvent.click(await screen.findByRole('radio', { name: 'Miles (mi)' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(mockUpdateSettings).toHaveBeenCalledWith({ mileageUnit: 'MILES' }))
    expect(await screen.findByText('Settings saved')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })

  it('explains that only administrators can change settings on 403', async () => {
    mockUpdateSettings.mockRejectedValue({ status: 403 })
    renderPage()

    fireEvent.click(await screen.findByRole('radio', { name: 'Miles (mi)' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Only administrators can change settings.')).toBeInTheDocument()
  })
})
