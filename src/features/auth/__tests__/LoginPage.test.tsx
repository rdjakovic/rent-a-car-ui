import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import LoginPage, { safeReturnTo } from '../LoginPage'
import { setSignedIn, useAuthStore } from '@/lib/auth/authStore'
import { MOCK_USER } from '@/lib/mocks/handlers'

function Where() {
  const location = useLocation()
  return <div>at {location.pathname}{location.search}</div>
}

function renderLogin(path = '/login') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>
  )
}

async function fillIn(user: ReturnType<typeof userEvent.setup>, username: string, password: string) {
  await user.type(screen.getByLabelText('Username or email'), username)
  await user.type(screen.getByLabelText('Password'), password)
}

describe('LoginPage', () => {
  it('signs in and goes to the page the user came from', async () => {
    const user = userEvent.setup()
    renderLogin('/login?returnTo=%2Fcars%3Fsearch%3Dcamry')

    await fillIn(user, 'admin', 'admin123')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('at /cars?search=camry')).toBeInTheDocument()
    expect(useAuthStore.getState().status).toBe('authenticated')
  })

  it('goes to the start page when there is nothing to return to', async () => {
    const user = userEvent.setup()
    renderLogin()

    await fillIn(user, 'admin@rentacar.com', 'admin123')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('at /')).toBeInTheDocument()
  })

  it("shows the backend's reason for a wrong password and clears the password", async () => {
    const user = userEvent.setup()
    renderLogin()

    await fillIn(user, 'admin', 'wrong-password')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid username or password')
    expect(screen.getByLabelText('Password')).toHaveValue('')
    expect(screen.getByLabelText('Username or email')).toHaveValue('admin')
    expect(useAuthStore.getState().status).not.toBe('authenticated')
  })

  it('needs both fields before it can be submitted', async () => {
    const user = userEvent.setup()
    renderLogin()
    const submit = screen.getByRole('button', { name: 'Sign in' })
    expect(submit).toBeDisabled()

    await user.type(screen.getByLabelText('Username or email'), 'admin')
    expect(submit).toBeDisabled()
    await user.type(screen.getByLabelText('Password'), 'x')
    expect(submit).toBeEnabled()
  })

  it('sends someone who is already signed in on to where they were going', async () => {
    setSignedIn('token', MOCK_USER)
    renderLogin('/login?returnTo=%2Fbranches')

    await waitFor(() => expect(screen.getByText('at /branches')).toBeInTheDocument())
  })

  it('only returns to pages of this app', () => {
    expect(safeReturnTo('/cars?x=1')).toBe('/cars?x=1')
    expect(safeReturnTo(null)).toBe('/')
    expect(safeReturnTo('')).toBe('/')
    expect(safeReturnTo('//evil.example/path')).toBe('/')
    expect(safeReturnTo('https://evil.example')).toBe('/')
    expect(safeReturnTo('/login?returnTo=/')).toBe('/')
  })
})
