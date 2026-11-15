import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/toaster'
import SettingsPage from '../SettingsPage'
import { getSettings, listBranches, updateSettings } from '@/lib/api/queries'
import { signInAs, type TestRole } from '@/test/authUsers'

vi.mock('@/lib/api/queries', () => ({
  getSettings: vi.fn(),
  updateSettings: vi.fn(),
  listBranches: vi.fn(),
}))

const mockGetSettings = getSettings as any
const mockUpdateSettings = updateSettings as any
const mockListBranches = listBranches as any

function renderPage(role: TestRole = 'ADMIN') {
  signInAs(role)
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
    mockListBranches.mockResolvedValue({
      content: [
        { id: 1, name: 'Downtown Branch', city: 'New York', active: true },
        { id: 2, name: 'Old Harbor', city: 'Boston', active: false },
      ],
    })
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

    await waitFor(() => expect(mockUpdateSettings).toHaveBeenCalledWith({ mileageUnit: 'MILES', defaultBranchId: undefined }))
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

  it('stays readable for staff, without the Save action', async () => {
    renderPage('STAFF')

    expect(await screen.findByRole('radio', { name: 'Kilometers (km)' })).toBeChecked()
    expect(screen.getByRole('combobox', { name: 'Default branch' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
    expect(screen.getByText('Only administrators can change settings.', { selector: 'p' })).toBeInTheDocument()
    // Nothing looks editable that can't be saved
    expect(screen.getByRole('radio', { name: 'Miles (mi)' })).toBeDisabled()
    expect(screen.getByRole('combobox', { name: 'Default branch' })).toBeDisabled()
  })

  it('shows the saved default branch and offers only open branches', async () => {
    mockGetSettings.mockResolvedValue({ mileageUnit: 'KILOMETERS', defaultBranchId: 1 })
    renderPage()

    const select = await screen.findByRole('combobox', { name: 'Default branch' })
    await waitFor(() => expect(select).toHaveTextContent('Downtown Branch (New York)'))
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()

    fireEvent.click(select)
    expect(await screen.findByRole('option', { name: 'No default branch' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /Old Harbor/ })).not.toBeInTheDocument()
  })

  it('saves a chosen default branch together with the mileage unit', async () => {
    mockUpdateSettings.mockResolvedValue({ mileageUnit: 'KILOMETERS', defaultBranchId: 1 })
    renderPage()

    fireEvent.click(await screen.findByRole('combobox', { name: 'Default branch' }))
    fireEvent.click(await screen.findByRole('option', { name: 'Downtown Branch (New York)' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(mockUpdateSettings).toHaveBeenCalledWith({ mileageUnit: 'KILOMETERS', defaultBranchId: 1 }))
    expect(await screen.findByText('Settings saved')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })

  it('clears the default branch with "No default branch"', async () => {
    mockGetSettings.mockResolvedValue({ mileageUnit: 'KILOMETERS', defaultBranchId: 1 })
    mockUpdateSettings.mockResolvedValue({ mileageUnit: 'KILOMETERS' })
    renderPage()

    const select = await screen.findByRole('combobox', { name: 'Default branch' })
    await waitFor(() => expect(select).toHaveTextContent('Downtown Branch'))
    fireEvent.click(select)
    fireEvent.click(await screen.findByRole('option', { name: 'No default branch' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(mockUpdateSettings).toHaveBeenCalledWith({ mileageUnit: 'KILOMETERS', defaultBranchId: undefined }))
  })
})
