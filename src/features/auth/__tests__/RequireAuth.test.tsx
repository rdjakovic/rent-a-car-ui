import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import RequireAuth from '../RequireAuth'
import { server } from '@/lib/mocks/server'
import { MOCK_USER } from '@/lib/mocks/handlers'
import { setSignedIn, setSignedOut, useAuthStore } from '@/lib/auth/authStore'

function LoginAt() {
  const location = useLocation()
  return <div>login page {location.search}</div>
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<LoginAt />} />
        <Route element={<RequireAuth />}>
          <Route path="/cars" element={<div>cars page</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
}

describe('RequireAuth', () => {
  it('shows the page to a signed-in user', () => {
    setSignedIn('token', MOCK_USER)
    renderAt('/cars')

    expect(screen.getByText('cars page')).toBeInTheDocument()
  })

  it('shows a placeholder while it is not yet known whether there is a session', () => {
    renderAt('/cars')

    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument()
    expect(screen.queryByText('cars page')).not.toBeInTheDocument()
  })

  it('sends someone without a session to the login page, remembering the page and its search', () => {
    setSignedOut()
    renderAt('/cars?search=camry')

    expect(screen.getByText(`login page ?returnTo=${encodeURIComponent('/cars?search=camry')}`)).toBeInTheDocument()
  })

  it('forgets the page after the user signed out on purpose', () => {
    setSignedOut(true)
    renderAt('/cars')

    expect(screen.getByText('login page')).toBeInTheDocument()
  })

  it('offers to try again when the server cannot be reached, and continues when it can', async () => {
    const user = userEvent.setup()
    useAuthStore.setState({ status: 'unavailable' })
    server.use(http.post('/api/v1/auth/refresh', () => HttpResponse.json({ access_token: 'back', user: MOCK_USER })))
    renderAt('/cars')

    expect(screen.getByRole('alert')).toHaveTextContent("Can't reach the server")
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    await waitFor(() => expect(screen.getByText('cars page')).toBeInTheDocument())
  })
})
