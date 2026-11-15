import { describe, it, expect } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/lib/mocks/server'
import { MOCK_USER } from '@/lib/mocks/handlers'
import { ApiError } from '@/lib/api/errors'
import { authFetch, initSession, login, logout, refreshSession } from '../session'
import { setSignedIn, useAuthStore } from '../authStore'

const problem = (status: number, detail: string) => HttpResponse.json({ title: 'x', status, detail }, { status })
const tokenResponse = (token: string) => HttpResponse.json({ access_token: token, expires_in: 900, user: MOCK_USER })

describe('login', () => {
  it('signs in with a username or an email and keeps the token and user in memory', async () => {
    const user = await login('admin', 'admin123')

    expect(user.username).toBe('admin')
    expect(useAuthStore.getState()).toMatchObject({ status: 'authenticated', accessToken: 'mock-access-token', signedOutByUser: false })
    await login('ADMIN@rentacar.com', 'admin123')
    expect(useAuthStore.getState().status).toBe('authenticated')
  })

  it("throws the backend's reason for a wrong password and stays signed out", async () => {
    await expect(login('admin', 'nope')).rejects.toMatchObject({ message: 'Invalid username or password', status: 401 })
    expect(useAuthStore.getState().status).toBe('loading')
  })

  it("shows the lockout message of a 429", async () => {
    server.use(http.post('/api/v1/auth/login', () => problem(429, 'Too many failed sign-in attempts. Try again in 15 minutes.')))

    const error = await login('admin', 'x').catch((e) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 429, message: 'Too many failed sign-in attempts. Try again in 15 minutes.' })
  })

  it('reports an unreachable server as a network error', async () => {
    server.use(http.post('/api/v1/auth/login', () => HttpResponse.error()))

    await expect(login('admin', 'admin123')).rejects.toMatchObject({ status: 0 })
  })
})

describe('refreshSession', () => {
  it('shares one request between concurrent callers (StrictMode, several queries failing together)', async () => {
    let calls = 0
    server.use(http.post('/api/v1/auth/refresh', async () => { calls++; return tokenResponse('fresh') }))

    const [first, second] = await Promise.all([refreshSession(), refreshSession(), initSession()])

    expect([first, second]).toEqual(['ok', 'ok'])
    expect(calls).toBe(1)
    expect(useAuthStore.getState()).toMatchObject({ status: 'authenticated', accessToken: 'fresh' })
    // A later refresh is a new request
    await refreshSession()
    expect(calls).toBe(2)
  })

  it('ends the session when the server says it is over', async () => {
    setSignedIn('old', MOCK_USER)
    server.use(http.post('/api/v1/auth/refresh', () => problem(401, 'Your session has ended. Please sign in again.')))

    expect(await refreshSession()).toBe('ended')
    expect(useAuthStore.getState()).toMatchObject({ status: 'anonymous', accessToken: null, user: null })
  })

  it('is "unavailable" when the server cannot be reached: unknown on page load, still signed in otherwise', async () => {
    server.use(http.post('/api/v1/auth/refresh', () => HttpResponse.error()))
    expect(await refreshSession()).toBe('unavailable')
    expect(useAuthStore.getState().status).toBe('unavailable')

    setSignedIn('token', MOCK_USER)
    server.use(http.post('/api/v1/auth/refresh', () => new HttpResponse(null, { status: 503 })))
    expect(await refreshSession()).toBe('unavailable')
    expect(useAuthStore.getState()).toMatchObject({ status: 'authenticated', accessToken: 'token' })
  })

  it('initSession tries again after "unavailable"', async () => {
    server.use(http.post('/api/v1/auth/refresh', () => HttpResponse.error()))
    await initSession()
    expect(useAuthStore.getState().status).toBe('unavailable')

    server.use(http.post('/api/v1/auth/refresh', () => tokenResponse('back')))
    await initSession()
    expect(useAuthStore.getState()).toMatchObject({ status: 'authenticated', accessToken: 'back' })
  })
})

describe('logout', () => {
  it('ends the session on the server and here, and remembers that the user chose it', async () => {
    await login('admin', 'admin123')

    await logout()

    expect(useAuthStore.getState()).toMatchObject({ status: 'anonymous', accessToken: null, signedOutByUser: true })
    expect(await refreshSession()).toBe('ended')
  })

  it('signs out here even if the server cannot be reached', async () => {
    setSignedIn('token', MOCK_USER)
    server.use(http.post('/api/v1/auth/logout', () => HttpResponse.error()))

    await logout()

    expect(useAuthStore.getState().status).toBe('anonymous')
  })
})

describe('authFetch', () => {
  const url = 'http://localhost:3000/api/v1/ping'

  it('sends the access token', async () => {
    let header: string | null = null
    server.use(http.get('/api/v1/ping', ({ request }) => { header = request.headers.get('Authorization'); return HttpResponse.json({}) }))
    setSignedIn('token-1', MOCK_USER)

    const response = await authFetch(new Request(url))

    expect(response.status).toBe(200)
    expect(header).toBe('Bearer token-1')
  })

  it('renews the token after a 401 and repeats the call once, with its body', async () => {
    const seen: Array<{ auth: string | null; body: string }> = []
    server.use(
      http.post('/api/v1/ping', async ({ request }) => {
        const auth = request.headers.get('Authorization')
        seen.push({ auth, body: await request.text() })
        return auth === 'Bearer token-2' ? HttpResponse.json({ ok: true }) : problem(401, 'Please sign in')
      }),
      http.post('/api/v1/auth/refresh', () => tokenResponse('token-2')),
    )
    setSignedIn('token-1', MOCK_USER)

    const response = await authFetch(new Request(url, { method: 'POST', body: '{"a":1}', headers: { 'Content-Type': 'application/json' } }))

    expect(response.status).toBe(200)
    expect(seen).toEqual([{ auth: 'Bearer token-1', body: '{"a":1}' }, { auth: 'Bearer token-2', body: '{"a":1}' }])
    expect(useAuthStore.getState().accessToken).toBe('token-2')
  })

  it('renews once for several calls that fail together', async () => {
    let refreshes = 0
    server.use(
      http.get('/api/v1/ping', ({ request }) =>
        request.headers.get('Authorization') === 'Bearer token-2' ? HttpResponse.json({}) : problem(401, 'Please sign in')),
      http.post('/api/v1/auth/refresh', () => { refreshes++; return tokenResponse('token-2') }),
    )
    setSignedIn('token-1', MOCK_USER)

    const responses = await Promise.all([1, 2, 3].map(() => authFetch(new Request(url))))

    expect(responses.map((r) => r.status)).toEqual([200, 200, 200])
    expect(refreshes).toBe(1)
  })

  it('gives up with the 401 when the session is over, and the app is told to sign in again', async () => {
    let pings = 0
    server.use(
      http.get('/api/v1/ping', () => { pings++; return problem(401, 'Please sign in') }),
      http.post('/api/v1/auth/refresh', () => problem(401, 'Your session has ended. Please sign in again.')),
    )
    setSignedIn('token-1', MOCK_USER)

    const response = await authFetch(new Request(url))

    expect(response.status).toBe(401)
    expect(pings).toBe(1)
    expect(useAuthStore.getState().status).toBe('anonymous')
  })

  it('does not renew after a 401 from the auth endpoints themselves (a wrong password is final)', async () => {
    let refreshes = 0
    server.use(http.post('/api/v1/auth/refresh', () => { refreshes++; return tokenResponse('x') }))

    const response = await authFetch(new Request('http://localhost:3000/api/v1/auth/login', {
      method: 'POST', body: '{"username":"admin","password":"nope"}', headers: { 'Content-Type': 'application/json' },
    }))

    expect(response.status).toBe(401)
    expect(refreshes).toBe(0)
  })

  it('does not repeat a call that failed for another reason', async () => {
    let pings = 0
    server.use(http.get('/api/v1/ping', () => { pings++; return problem(403, 'nope') }))
    setSignedIn('token-1', MOCK_USER)

    expect((await authFetch(new Request(url))).status).toBe(403)
    expect(pings).toBe(1)
  })
})
