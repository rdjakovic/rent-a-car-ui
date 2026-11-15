import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/toaster'
import ChangePasswordPage from '../ChangePasswordPage'
import { changePassword } from '@/lib/api/queries'

vi.mock('@/lib/api/queries', () => ({ changePassword: vi.fn() }))

const mockChangePassword = changePassword as any

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <ChangePasswordPage />
      <Toaster />
    </QueryClientProvider>
  )
}

function fill(current: string, next: string, confirm: string) {
  fireEvent.change(screen.getByLabelText('Current password'), { target: { value: current } })
  fireEvent.change(screen.getByLabelText('New password'), { target: { value: next } })
  fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: confirm } })
}

describe('ChangePasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('changes the password and tells that the other sessions ended', async () => {
    mockChangePassword.mockResolvedValue(undefined)
    renderPage()

    fill('admin123', 'newpass123', 'newpass123')
    fireEvent.click(screen.getByRole('button', { name: 'Change password' }))

    await waitFor(() => expect(mockChangePassword).toHaveBeenCalledWith({
      currentPassword: 'admin123', newPassword: 'newpass123',
    }))
    expect(await screen.findByText('Password changed')).toBeInTheDocument()
    expect(screen.getByLabelText('Current password')).toHaveValue('')
  })

  it('needs matching passwords of at least 8 characters', () => {
    renderPage()

    fill('admin123', 'short', 'short')
    expect(screen.getByText('The new password needs at least 8 characters.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Change password' })).toBeDisabled()

    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'newpass123' } })
    expect(screen.getByText('The passwords do not match.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Change password' })).toBeDisabled()
  })

  it("shows the backend's reason when the current password is wrong", async () => {
    mockChangePassword.mockRejectedValue({ status: 400, detail: 'Current password is incorrect' })
    renderPage()

    fill('wrong-password', 'newpass123', 'newpass123')
    fireEvent.click(screen.getByRole('button', { name: 'Change password' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Current password is incorrect')
    expect(screen.getByLabelText('Current password')).toHaveValue('wrong-password')
  })
})
