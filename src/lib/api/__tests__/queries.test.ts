import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/lib/mocks/server'
import { ApiError } from '../errors'
import {
  cancelReservation,
  createBranch,
  findAvailableCars,
  getCarById,
  getSettings,
  listBranches,
  listCars,
  searchBranches,
  updateSettings,
} from '../queries'

/** Overrides a GET handler and records the URL it was called with. */
function captureGet(path: string, body: Record<string, unknown> = { content: [] }) {
  const seen: URL[] = []
  server.use(
    http.get(path, ({ request }) => {
      seen.push(new URL(request.url))
      return HttpResponse.json(body)
    }),
  )
  return seen
}

describe('API query functions', () => {
  describe('successful calls', () => {
    it('returns the response body', async () => {
      server.use(http.get('/api/v1/settings', () => HttpResponse.json({ mileageUnit: 'MILES' })))

      expect(await getSettings()).toEqual({ mileageUnit: 'MILES' })
    })

    it('sends paging params for listBranches', async () => {
      const seen = captureGet('/api/v1/branches')

      await listBranches({ page: 2, size: 5, sort: ['name,asc'] })

      expect(seen[0].searchParams.get('page')).toBe('2')
      expect(seen[0].searchParams.get('size')).toBe('5')
      expect(seen[0].searchParams.get('sort')).toBe('name,asc')
    })

    it('sends name and city for searchBranches', async () => {
      const seen = captureGet('/api/v1/branches/search')

      await searchBranches({ name: 'air', city: 'new york' })

      expect(seen[0].searchParams.get('name')).toBe('air')
      expect(seen[0].searchParams.get('city')).toBe('new york')
    })

    it('sends the car filters for listCars', async () => {
      const seen = captureGet('/api/v1/cars')

      await listCars({ make: 'Toyota', year: 2022 })

      expect(seen[0].searchParams.get('make')).toBe('Toyota')
      expect(seen[0].searchParams.get('year')).toBe('2022')
    })

    it('sends branch, dates and filters for findAvailableCars', async () => {
      const seen = captureGet('/api/v1/cars/available')

      await findAvailableCars({ branchId: 3, startDate: '2030-01-10', endDate: '2030-01-12', minSeats: 5 })

      const params = seen[0].searchParams
      expect(params.get('branchId')).toBe('3')
      expect(params.get('startDate')).toBe('2030-01-10')
      expect(params.get('endDate')).toBe('2030-01-12')
      expect(params.get('minSeats')).toBe('5')
    })

    it('puts the id into the path', async () => {
      const seen = captureGet('/api/v1/cars/:id', { id: 7 })

      await getCarById(7)

      expect(seen[0].pathname).toBe('/api/v1/cars/7')
    })

    it('sends the body as JSON', async () => {
      let received: unknown
      server.use(
        http.put('/api/v1/settings', async ({ request }) => {
          received = await request.json()
          return HttpResponse.json({ mileageUnit: 'MILES' })
        }),
      )

      await updateSettings({ mileageUnit: 'MILES' })

      expect(received).toEqual({ mileageUnit: 'MILES' })
    })
  })

  describe('failed calls', () => {
    it("throws an ApiError with the backend's reason", async () => {
      server.use(
        http.get('/api/v1/cars/:id', () =>
          HttpResponse.json({ title: 'Not Found', status: 404, detail: 'Car not found: 99' }, { status: 404 }),
        ),
      )

      const error = await getCarById(99).catch((e: unknown) => e)

      expect(error).toBeInstanceOf(ApiError)
      expect((error as ApiError).status).toBe(404)
      expect((error as ApiError).message).toContain('Car not found: 99')
    })

    it('keeps the status of a conflict', async () => {
      server.use(
        http.post('/api/v1/reservations/:id/cancel', () =>
          HttpResponse.json({ title: 'Conflict', status: 409, detail: 'Already cancelled' }, { status: 409 }),
        ),
      )

      await expect(cancelReservation(1)).rejects.toMatchObject({ status: 409 })
    })

    it('treats a 403 without a body as an error, not as success', async () => {
      server.use(http.post('/api/v1/branches', () => new HttpResponse(null, { status: 403 })))

      await expect(
        createBranch({ name: 'X', address: 'A', city: 'C', country: 'Y', phone: '1', email: 'x@y.z' }),
      ).rejects.toMatchObject({ name: 'ApiError', status: 403 })
    })

    it('turns a network failure into an ApiError with status 0', async () => {
      server.use(http.get('/api/v1/settings', () => HttpResponse.error()))

      await expect(getSettings()).rejects.toMatchObject({ name: 'ApiError', status: 0 })
    })
  })
})
