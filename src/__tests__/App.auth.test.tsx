import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import App from '@/App'
import { server } from '@/lib/mocks/server'
import { MOCK_USER } from '@/lib/mocks/handlers'
import { useAuthStore } from '@/lib/auth/authStore'
import { useCarsFilters } from '@/stores/filterStore'

function renderApp(path: string, queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>
  )
  return queryClient
}

async function signIn(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText('Username or email'), 'admin')
  await user.type(screen.getByLabelText('Password'), 'admin123')
  await user.click(screen.getByRole('button', { name: 'Sign in' }))
}

describe('App sign-in flow', () => {
  it('asks for sign-in first, then shows the page that was asked for, with the user menu', async () => {
    const user = userEvent.setup()
    renderApp('/settings')

    // No session: the login page, without the navigation
    expect(await screen.findByLabelText('Username or email')).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument()

    await signIn(user)

    expect(await screen.findByRole('heading', { name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Account menu for System Administrator' })).toBeInTheDocument()
  })

  it('restores the session on load from the refresh cookie, without asking for a password', async () => {
    server.use(http.post('/api/v1/auth/refresh', () => HttpResponse.json({ access_token: 'restored', user: MOCK_USER })))
    renderApp('/settings')

    expect(await screen.findByRole('heading', { name: 'Settings' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Username or email')).not.toBeInTheDocument()
  })

  it('signing out drops cached data and saved filters, and the next sign-in starts on the start page', async () => {
    const user = userEvent.setup()
    server.use(http.post('/api/v1/auth/refresh', () => HttpResponse.json({ access_token: 'restored', user: MOCK_USER })))
    useCarsFilters.setState({ search: 'camry' })
    const queryClient = renderApp('/cars')
    await screen.findByRole('navigation', { name: 'Main' })
    queryClient.setQueryData(['private'], { secret: true })

    await user.click(screen.getByRole('button', { name: 'Account menu for System Administrator' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Log out' }))

    expect(await screen.findByLabelText('Username or email')).toBeInTheDocument()
    expect(useAuthStore.getState()).toMatchObject({ status: 'anonymous', accessToken: null, user: null })
    expect(queryClient.getQueryData(['private'])).toBeUndefined()
    expect(useCarsFilters.getState().search).toBe('')
    // Nothing to come back to after signing out on purpose
    expect(screen.queryByText(/returnTo/)).not.toBeInTheDocument()
  })

  it('goes to the login page when the session runs out while using the app', async () => {
    server.use(http.post('/api/v1/auth/refresh', () => HttpResponse.json({ access_token: 'restored', user: MOCK_USER })))
    renderApp('/settings')
    await screen.findByRole('heading', { name: 'Settings' })

    // From now on the token is refused and the session cannot be renewed
    server.use(
      http.get('/api/v1/branches/search', () => HttpResponse.json({ title: 'Unauthorized', status: 401 }, { status: 401 })),
      http.post('/api/v1/auth/refresh', () => HttpResponse.json({ title: 'Unauthorized', status: 401 }, { status: 401 })),
    )
    await userEvent.setup().click(screen.getByRole('link', { name: 'Branches' }))

    await waitFor(() => expect(screen.getByLabelText('Username or email')).toBeInTheDocument())
    expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument()
  })
})
