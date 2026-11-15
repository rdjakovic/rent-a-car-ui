import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/toaster'
import BranchesPage from '../BranchesPage'
import { createBranch, searchBranches, updateBranch } from '@/lib/api/queries'
import { signInAs, type TestRole } from '@/test/authUsers'

vi.mock('@/lib/api/queries', () => ({
  searchBranches: vi.fn(),
  createBranch: vi.fn(),
  updateBranch: vi.fn(),
}))

const mockSearch = searchBranches as any
const mockCreate = createBranch as any
const mockUpdate = updateBranch as any

const downtown = {
  id: 1, name: 'Downtown Branch', address: '123 Main Street', city: 'New York', country: 'USA',
  phone: '+15550101', email: 'downtown@rentacar.com', openingHours: 'Mon-Fri 8:00-18:00', active: true,
}
const closed = { ...downtown, id: 2, name: 'Old Harbor', city: 'Boston', active: false }

const page = (content: object[]) => ({ content, number: 0, totalPages: 1, totalElements: content.length })

function renderPage(role: TestRole = 'ADMIN') {
  signInAs(role)
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <BranchesPage />
      <Toaster />
    </QueryClientProvider>
  )
}

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

describe('BranchesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSearch.mockResolvedValue(page([downtown, closed]))
  })

  it('lists branches with their status', async () => {
    renderPage()

    expect(await screen.findByText('Downtown Branch')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('Inactive')).toBeInTheDocument()
    expect(mockSearch).toHaveBeenCalledWith({ page: 0, size: 10, name: undefined, city: undefined })
  })

  it('searches by name and by city', async () => {
    renderPage()
    await screen.findByText('Downtown Branch')

    fireEvent.change(screen.getByPlaceholderText('Search branches by name...'), { target: { value: 'harb' } })
    await waitFor(() => expect(mockSearch).toHaveBeenCalledWith({ page: 0, size: 10, name: 'harb', city: undefined }))

    fireEvent.change(screen.getByPlaceholderText('Search branches by city...'), { target: { value: 'bos' } })
    await waitFor(() => expect(mockSearch).toHaveBeenCalledWith({ page: 0, size: 10, name: 'harb', city: 'bos' }))
  })

  it('says when nothing matches the search', async () => {
    mockSearch.mockResolvedValue(page([]))
    renderPage()

    fireEvent.change(screen.getByPlaceholderText('Search branches by name...'), { target: { value: 'zzz' } })

    expect(await screen.findByText('No branches match your search.')).toBeInTheDocument()
  })

  it('creates a branch, active by default', async () => {
    mockCreate.mockResolvedValue({ ...downtown, id: 9 })
    renderPage()
    await screen.findByText('Downtown Branch')

    fireEvent.click(screen.getByRole('button', { name: /New branch/ }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('checkbox', { name: 'Active' })).toBeChecked()

    fill('Name', 'Harbor Gate')
    fill('Email', 'harbor@rentacar.com')
    fill('Phone', '+15550199')
    fill('City', 'Boston')
    fill('Country', 'USA')
    fill('Address', '1 Quay St')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create branch' }))

    await waitFor(() => expect(mockCreate).toHaveBeenCalledWith({
      name: 'Harbor Gate', address: '1 Quay St', city: 'Boston', country: 'USA',
      phone: '+15550199', email: 'harbor@rentacar.com', openingHours: undefined, active: true,
    }))
    expect(await screen.findByText('Branch created')).toBeInTheDocument()
  })

  it('validates the form before saving', async () => {
    renderPage()
    await screen.findByText('Downtown Branch')

    fireEvent.click(screen.getByRole('button', { name: /New branch/ }))
    const dialog = await screen.findByRole('dialog')
    fill('Phone', 'call me')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create branch' }))

    expect(await within(dialog).findByText('Name is required')).toBeInTheDocument()
    expect(within(dialog).getByText('Phone number should be valid, e.g. +15550101')).toBeInTheDocument()
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it("shows the backend's reason when creating fails", async () => {
    mockCreate.mockRejectedValue(new Error('Branch already exists: Harbor Gate in Boston'))
    renderPage()
    await screen.findByText('Downtown Branch')

    fireEvent.click(screen.getByRole('button', { name: /New branch/ }))
    await screen.findByRole('dialog')
    fill('Name', 'Harbor Gate')
    fill('City', 'Boston')
    fill('Country', 'USA')
    fill('Address', '1 Quay St')
    fireEvent.click(screen.getByRole('button', { name: 'Create branch' }))

    expect(await screen.findByText('Branch already exists: Harbor Gate in Boston')).toBeInTheDocument()
  })

  it('edits a branch and can close it', async () => {
    mockUpdate.mockResolvedValue({ ...downtown, active: false })
    renderPage()
    await screen.findByText('Downtown Branch')

    fireEvent.click(screen.getByRole('button', { name: 'Edit Downtown Branch' }))
    const dialog = await screen.findByRole('dialog')
    expect(screen.getByLabelText('Name')).toHaveValue('Downtown Branch')
    expect(within(dialog).getByRole('checkbox', { name: 'Active' })).toBeChecked()

    fireEvent.click(within(dialog).getByRole('checkbox', { name: 'Active' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith(1, expect.objectContaining({
      name: 'Downtown Branch', city: 'New York', active: false,
    })))
    expect(await screen.findByText('Branch updated')).toBeInTheDocument()
  })

  it('hides branch changes from a manager', async () => {
    renderPage('MANAGER')
    await screen.findByText('Downtown Branch')

    expect(screen.queryByRole('button', { name: /New branch/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit Downtown Branch' })).not.toBeInTheDocument()
  })

  it('tells that an inactive branch is not bookable', async () => {
    renderPage()
    await screen.findByText('Downtown Branch')

    fireEvent.click(screen.getByRole('button', { name: /New branch/ }))
    const dialog = await screen.findByRole('dialog')

    expect(within(dialog).getByText(/aren't offered for booking/)).toBeInTheDocument()
  })
})
