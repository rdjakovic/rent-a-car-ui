import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/api/errors'
import { login } from '@/lib/auth/session'
import {
  type BranchResponseDto,
  changePassword,
  completeReservation,
  confirmReservation,
  createCar,
  createReservation,
  getCarById,
  getMaintenance,
  getReservationById,
  listBranches,
  listUsers,
  listCars,
  pickUpReservation,
  searchBranches,
  startMaintenance,
  updateBranch,
  updateSettings,
} from '@/lib/api/queries'
import { daysFromToday } from '@/lib/dates'

// The handlers sleep 500 ms per request to feel like a network in the dev UI; not needed here
vi.mock('@/lib/mocks/data', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/mocks/data')>()),
  delay: () => Promise.resolve(),
}))

const firstBranch = async () => (await listBranches({ size: 1 })).content![0]
const asRequest = (b: BranchResponseDto) => ({ ...b, name: b.name!, address: b.address!, city: b.city!, country: b.country! })

/** The default MSW handlers should behave like the backend, because the page tests rely on them. */
describe('mock API handlers', () => {
  describe('branches', () => {
    it('lists the branches in a page', async () => {
      const page = await listBranches({ page: 0, size: 2 })

      expect(page.content).toHaveLength(2)
      expect(page.totalElements).toBeGreaterThanOrEqual(3)
    })

    it('searches by partial, case-insensitive name', async () => {
      const page = await searchBranches({ name: 'AIRPORT' })

      expect(page.content?.map(b => b.name)).toEqual(['Airport Branch'])
    })

    it('searches by city and combines it with name', async () => {
      const byCity = await searchBranches({ city: 'new york' })
      const both = await searchBranches({ city: 'new york', name: 'down' })

      expect(byCity.content?.length).toBeGreaterThan(1)
      expect(both.content?.map(b => b.name)).toEqual(['Downtown Branch'])
    })

    it('ignores blank search filters', async () => {
      const all = await listBranches({ size: 100 })
      const blank = await searchBranches({ name: ' ', city: '', size: 100 })

      expect(blank.totalElements).toBe(all.totalElements)
    })

    it('keeps the active status when an update leaves it out', async () => {
      const branch = await firstBranch()

      const updated = await updateBranch(branch.id!, { ...asRequest(branch), phone: '+1-555-9999', active: undefined })

      expect(updated.phone).toBe('+1-555-9999')
      expect(updated.active).toBe(branch.active)
    })

    it('answers 404 for an unknown branch', async () => {
      const branch = await firstBranch()

      await expect(updateBranch(999_999, asRequest(branch))).rejects.toMatchObject({ status: 404 })
    })
  })

  describe('cars', () => {
    it('matches make partially and year exactly', async () => {
      const { content } = await listCars({ make: 'toy', size: 100 })

      expect(content?.length).toBeGreaterThan(0)
      expect(content?.every(c => c.make?.toLowerCase().includes('toy'))).toBe(true)
      expect((await listCars({ year: 1900 })).content).toEqual([])
    })

    it('answers 404 for an unknown car', async () => {
      const error = await getCarById(999_999).catch((e: unknown) => e)

      expect(error).toBeInstanceOf(ApiError)
      expect((error as ApiError).status).toBe(404)
    })

    it('rejects a duplicate VIN with 409', async () => {
      const [car] = (await listCars({ size: 1 })).content ?? []

      await expect(
        createCar({ ...car, branchId: 1, dailyPrice: 50 } as Parameters<typeof createCar>[0]),
      ).rejects.toMatchObject({ status: 409 })
    })
  })

  describe('reservations', () => {
    const booking = (startDate: string, endDate: string) => ({
      customerId: 1, carId: 1, pickupBranchId: 1, dropoffBranchId: 1, startDate, endDate,
    })

    it('walks a reservation through confirm, pick-up and return, and refuses the wrong order', async () => {
      const created = await createReservation(booking(daysFromToday(1), daysFromToday(3)))
      const id = created.id!
      expect(created.status).toBe('PENDING')

      await expect(pickUpReservation(id)).rejects.toMatchObject({ status: 409 })
      expect((await confirmReservation(id)).status).toBe('CONFIRMED')
      await expect(completeReservation(id)).rejects.toMatchObject({ status: 409 })

      const active = await pickUpReservation(id, { mileageOut: 1200 })
      expect(active.status).toBe('ACTIVE')
      expect(active.mileageOut).toBe(1200)

      const done = await completeReservation(id, { mileageIn: 1500 })
      expect(done.status).toBe('COMPLETED')
      expect((await getReservationById(id)).status).toBe('COMPLETED')
    })

    it('charges a same-day rental as one day', async () => {
      const today = daysFromToday(0)

      const created = await createReservation(booking(today, today))

      expect(created.durationDays).toBe(1)
    })

    it('rejects an unknown customer with 400', async () => {
      await expect(
        createReservation({ ...booking(daysFromToday(1), daysFromToday(2)), customerId: 999_999 }),
      ).rejects.toMatchObject({ status: 400 })
    })
  })

  describe('accounts', () => {
    it('lists the accounts for a manager, but refuses a staff member', async () => {
      await login('maria.manager', 'admin123')

      expect((await listUsers()).content?.map((u) => u.username)).toEqual(['admin', 'maria.manager', 'john.doe'])

      await login('john.doe', 'admin123')
      await expect(listUsers()).rejects.toMatchObject({ status: 403 })
    })

    it('changes the signed-in password only with the current one', async () => {
      await login('admin', 'admin123')

      await expect(changePassword({ currentPassword: 'wrong', newPassword: 'newpass123' }))
        .rejects.toMatchObject({ status: 400 })
      await expect(changePassword({ currentPassword: 'admin123', newPassword: 'newpass123' }))
        .resolves.toBeUndefined()
    })
  })

  describe('settings and maintenance', () => {
    it('rejects an invalid mileage unit with 400', async () => {
      await expect(updateSettings({ mileageUnit: 'FURLONGS' as never })).rejects.toMatchObject({ status: 400 })
    })

    it('only starts a SCHEDULED job', async () => {
      expect((await getMaintenance(9002)).status).toBe('IN_PROGRESS')

      await expect(startMaintenance(9002)).rejects.toMatchObject({ status: 409 })
      await expect(startMaintenance(999_999)).rejects.toMatchObject({ status: 404 })
    })
  })
})
