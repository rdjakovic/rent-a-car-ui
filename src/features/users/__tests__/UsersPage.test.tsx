import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import UsersPage from '../UsersPage'
import { createUser, listBranches, listUsers, resetUserPassword, updateUser } from '@/lib/api/queries'
import { signInAs, type TestRole } from '@/test/authUsers'

vi.mock('@/lib/api/queries', () => ({
  listUsers: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  resetUserPassword: vi.fn(),
  listBranches: vi.fn(),
}))

const mockListUsers = listUsers as any
const mockCreateUser = createUser as any
const mockUpdateUser = updateUser as any
const mockResetPassword = resetUserPassword as any

const admin = {
  id: 1, username: 'admin', email: 'admin@rentacar.com', firstName: 'System', lastName: 'Administrator',
  enabled: true, roles: ['ADMIN'], permissions: ['USER_VIEW', 'USER_MANAGE'],
}
const manager = {
  id: 2, username: 'maria.manager', email: 'maria.manager@rentacar.com', firstName: 'Maria', lastName: 'Manager',
  enabled: true, roles: ['MANAGER'], branchId: 1, branchName: 'Downtown Branch',
}
const staff = {
  id: 3, username: 'john.doe', email: 'john.doe@rentacar.com', firstName: 'John', lastName: 'Doe',
  enabled: true, roles: ['STAFF'], branchId: 1, branchName: 'Downtown Branch',
}

const page = (content: object[]) => ({ content, number: 0, totalPages: 1, totalElements: content.length })

function renderPage(role: TestRole = 'ADMIN') {
  signInAs(role)
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>
      <Toaster />
    </QueryClientProvider>
  )
}

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

async function choose(label: string, option: string) {
  fireEvent.click(screen.getByRole('combobox', { name: label }))
  fireEvent.click(await screen.findByRole('option', { name: option }))
}

describe('UsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockListUsers.mockResolvedValue(page([admin, manager, staff]))
    ;(listBranches as any).mockResolvedValue({
      content: [{ id: 1, name: 'Downtown Branch', city: 'New York', active: true }],
    })
  })

  it('lists the accounts with role, branch and status for an administrator', async () => {
    renderPage()

    expect(await screen.findByText('Maria Manager')).toBeInTheDocument()
    expect(screen.getByText('maria.manager')).toBeInTheDocument()
    expect(screen.getAllByText('Downtown Branch')).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'New user' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit maria.manager' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reset password for maria.manager' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Disable maria.manager' })).toBeInTheDocument()
    // An administrator can't disable themselves
    expect(screen.queryByRole('button', { name: 'Disable admin' })).not.toBeInTheDocument()
  })

  it('lets a manager create staff, but not change accounts', async () => {
    renderPage('MANAGER')

    expect(await screen.findByText('John Doe')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New user' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit john.doe' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reset password for john.doe' })).not.toBeInTheDocument()
    expect(screen.getAllByText('View only')).toHaveLength(3)
  })

  it('creates a staff account with a branch', async () => {
    mockCreateUser.mockResolvedValue({ id: 9, username: 'jane.staff' })
    renderPage()
    await screen.findByText('Maria Manager')

    fireEvent.click(screen.getByRole('button', { name: 'New user' }))
    const dialog = await screen.findByRole('dialog')
    fill('Username', 'jane.staff')
    fill('Email', 'jane.staff@rentacar.com')
    fill('First name', 'Jane')
    fill('Last name', 'Staff')
    fill('Initial password', 'password123')
    await choose('Branch', 'Downtown Branch (New York)')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create user' }))

    await waitFor(() => expect(mockCreateUser).toHaveBeenCalledWith(expect.objectContaining({
      username: 'jane.staff', email: 'jane.staff@rentacar.com', firstName: 'Jane', lastName: 'Staff',
      password: 'password123', role: 'STAFF', branchId: 1, phone: undefined,
    })))
    expect(await screen.findByText('User created')).toBeInTheDocument()
  })

  it('disables an account after confirmation', async () => {
    mockUpdateUser.mockResolvedValue({ ...staff, enabled: false })
    renderPage()
    await screen.findByText('John Doe')

    fireEvent.click(screen.getByRole('button', { name: 'Disable john.doe' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/won't be able to sign in/)).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Disable' }))

    await waitFor(() => expect(mockUpdateUser).toHaveBeenCalledWith(3, expect.objectContaining({
      email: 'john.doe@rentacar.com', firstName: 'John', lastName: 'Doe', role: 'STAFF', branchId: 1,
      enabled: false,
    })))
    expect(await screen.findByText('Account disabled')).toBeInTheDocument()
  })

  it('resets a password', async () => {
    mockResetPassword.mockResolvedValue(undefined)
    renderPage()
    await screen.findByText('John Doe')

    fireEvent.click(screen.getByRole('button', { name: 'Reset password for john.doe' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('New password'), { target: { value: 'newpass123' } })
    fireEvent.change(within(dialog).getByLabelText('Confirm password'), { target: { value: 'newpass123' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Reset password' }))

    await waitFor(() => expect(mockResetPassword).toHaveBeenCalledWith(3, 'newpass123'))
    expect(await screen.findByText('Password reset')).toBeInTheDocument()
  })
})
