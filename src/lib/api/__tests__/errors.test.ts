import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiErrorFromResponse, errorMessage, normalizeError } from '../errors'
import { RETRY_CONFIG } from '@/lib/query/config'

const problem = (status: number, extra: object = {}) =>
  new Response(JSON.stringify({ type: 'about:blank', title: 'Problem', status, ...extra }), {
    status,
    headers: { 'Content-Type': 'application/problem+json' },
  })

/**
 * Query functions with fetch stubbed. The API client takes fetch and the base URL when it is created,
 * so the modules are loaded fresh (including errors.ts, hence the ApiError class returned alongside).
 */
async function queriesWith(response: () => Response | Promise<Response>) {
  vi.resetModules()
  vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080')
  vi.stubGlobal('fetch', vi.fn(async () => response()))
  const queries = await import('../queries')
  const { ApiError: FreshApiError } = await import('../errors')
  return { ...queries, FreshApiError }
}

describe('API errors', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it("keeps the backend's reason for a conflict", async () => {
    const { createReservation, FreshApiError } = await queriesWith(() =>
      problem(409, { title: 'Conflict', detail: 'Car is not available for the selected dates' }))

    const error = await createReservation({} as any).catch((e) => e)

    expect(error).toBeInstanceOf(FreshApiError)
    expect(error).toMatchObject({ status: 409, code: 'RESOURCE_CONFLICT', message: 'Car is not available for the selected dates' })
  })

  it('treats a 403 without a body as an error, not as success', async () => {
    const { listReservations, FreshApiError } = await queriesWith(() => new Response(null, { status: 403 }))

    const error = await listReservations().catch((e) => e)

    expect(error).toBeInstanceOf(FreshApiError)
    expect(error).toMatchObject({ status: 403, code: 'FORBIDDEN' })
    expect(error.message).toMatch(/permission/)
  })

  it('lists field errors of a validation failure', async () => {
    const { createCustomer } = await queriesWith(() => problem(400, {
      title: 'Validation Failed',
      detail: 'Request validation failed',
      errors: [{ field: 'email', message: 'Email should be valid' }, { field: 'phone', message: 'Phone number should be valid' }],
    }))

    const error = await createCustomer({} as any).catch((e) => e)

    expect(error.status).toBe(400)
    expect(error.message).toBe('email: Email should be valid; phone: Phone number should be valid')
    expect(error.details).toEqual([
      { field: 'email', message: 'Email should be valid' },
      { field: 'phone', message: 'Phone number should be valid' },
    ])
  })

  it('reports a network failure with status 0', async () => {
    const { getCarById } = await queriesWith(() => { throw new TypeError('Failed to fetch') })

    const error = await getCarById(1).catch((e) => e)

    expect(error).toMatchObject({ status: 0, code: 'NETWORK_ERROR' })
  })

  it('returns the data of a successful call', async () => {
    const { getSettings } = await queriesWith(() =>
      new Response(JSON.stringify({ mileageUnit: 'MILES' }), { status: 200, headers: { 'Content-Type': 'application/json' } }))

    await expect(getSettings()).resolves.toEqual({ mileageUnit: 'MILES' })
  })

  it("doesn't show server internals for a 500", () => {
    expect(apiErrorFromResponse(500, { title: 'Internal Server Error', detail: 'NullPointerException at ...' }).message)
      .toBe('A server error occurred. Please try again later.')
  })

  it('normalizes problem details and other thrown values', () => {
    const existing = new ApiError({ message: 'Kept', status: 409 })
    expect(normalizeError(existing)).toBe(existing)
    expect(errorMessage({ status: 409, detail: 'Car has a reservation on 2026-11-22' })).toBe('Car has a reservation on 2026-11-22')
    expect(errorMessage(new Error('Boom'))).toBe('Boom')
    expect(errorMessage(undefined)).toBe('An unexpected error occurred. Please try again.')
  })

  it('does not retry client errors, but retries server and network errors', () => {
    const retry = RETRY_CONFIG.query.retry
    expect(retry(0, apiErrorFromResponse(404, { detail: 'Car not found: 9' }))).toBe(false)
    expect(retry(0, apiErrorFromResponse(409, { detail: 'Conflict' }))).toBe(false)
    expect(retry(0, apiErrorFromResponse(503, ''))).toBe(true)
    expect(retry(0, normalizeError(new TypeError('Failed to fetch')))).toBe(true)
  })
})
