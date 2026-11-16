import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/toaster'
import CarFormDialog from '../CarFormDialog'
import { createCar, deleteCarImage, getSettings, listBranches, updateCar, uploadCarImages } from '@/lib/api/queries'

vi.mock('@/lib/api/queries', () => ({
  createCar: vi.fn(),
  updateCar: vi.fn(),
  deleteCarImage: vi.fn(),
  getSettings: vi.fn(),
  listBranches: vi.fn(),
  uploadCarImages: vi.fn(),
  carImageUrl: (url: string) => url,
}))

const mockCreate = createCar as any
const mockUpdate = updateCar as any
const mockDeleteImage = deleteCarImage as any
const mockUpload = uploadCarImages as any

function renderDialog(onOpenChange = vi.fn(), car?: any) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <CarFormDialog open onOpenChange={onOpenChange} car={car} />
      <Toaster />
    </QueryClientProvider>
  )
  return { onOpenChange, queryClient }
}

function fill(label: string | RegExp, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

/** Opens a Radix select by its label and picks an option. */
async function choose(label: string, option: string) {
  fireEvent.click(screen.getByRole('combobox', { name: label }))
  fireEvent.click(await screen.findByRole('option', { name: option }))
}

function fillRequired() {
  fill('VIN', '1hgbh41jxmn109186')
  fill('Make', 'Toyota')
  fill('Model', 'Camry')
  fill('Daily price (USD)', '45.50')
}

const existingCar = {
  id: 20,
  vin: '1HGBH41JXMN109186',
  make: 'Toyota',
  model: 'Camry',
  year: 2023,
  category: 'INTERMEDIATE',
  transmission: 'AUTOMATIC',
  fuelType: 'GASOLINE',
  seats: 5,
  mileage: 12000,
  status: 'AVAILABLE',
  dailyPrice: 45,
  branch: { id: 1, name: 'Downtown Branch', city: 'New York' },
  color: 'Silver',
  licensePlate: 'NY-1234',
  insurancePolicy: 'POL-1',
  displayName: '2023 Toyota Camry',
  images: [{ id: 9, url: '/api/v1/cars/20/images/9', fileName: 'old.png' }],
}

describe('CarFormDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(getSettings as any).mockResolvedValue({ mileageUnit: 'KILOMETERS' })
    ;(listBranches as any).mockResolvedValue({
      content: [
        { id: 1, name: 'Downtown Branch', city: 'New York', active: true },
        { id: 2, name: 'Old Harbor', city: 'Boston', active: false },
      ],
    })
    mockCreate.mockResolvedValue({ id: 20, displayName: '2026 Toyota Camry' })
    mockUpdate.mockResolvedValue({ ...existingCar, dailyPrice: 59 })
    mockDeleteImage.mockResolvedValue(undefined)
    mockUpload.mockResolvedValue([])
  })

  const png = (name: string) => new File(
    [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], name, { type: 'image/png' },
  )

  it('adds a car with the entered details', async () => {
    const { onOpenChange } = renderDialog()
    fillRequired()
    fill('Color', 'Silver')
    await choose('Branch', 'Downtown Branch · New York')
    fireEvent.click(screen.getByRole('button', { name: 'Add car' }))

    await waitFor(() => expect(mockCreate).toHaveBeenCalledWith({
      vin: '1HGBH41JXMN109186', make: 'Toyota', model: 'Camry', year: new Date().getFullYear(),
      category: 'ECONOMY', transmission: 'AUTOMATIC', fuelType: 'GASOLINE', seats: 5, mileage: 0,
      status: 'AVAILABLE', dailyPrice: 45.5, branchId: 1, color: 'Silver',
      licensePlate: undefined, insurancePolicy: undefined,
    }))
    expect(await screen.findByText('Car added')).toBeInTheDocument()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('offers only active branches, and only statuses a new car can have', async () => {
    renderDialog()

    fireEvent.click(screen.getByRole('combobox', { name: 'Branch' }))
    expect(await screen.findByRole('option', { name: 'Downtown Branch · New York' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /Old Harbor/ })).not.toBeInTheDocument()
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' })

    fireEvent.click(screen.getByRole('combobox', { name: 'Status' }))
    const options = (await screen.findAllByRole('option')).map((o) => o.textContent)
    expect(options).toEqual(['Available', 'Out of service'])
  })

  it('edits an existing car and removes one of its photos', async () => {
    const { onOpenChange } = renderDialog(vi.fn(), existingCar)

    expect(screen.getByRole('heading', { name: 'Edit car' })).toBeInTheDocument()
    expect(screen.getByLabelText('Daily price (USD)')).toHaveValue('45.00')
    expect(screen.getByAltText('old.png')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Remove current photo 1' }))
    fill('Daily price (USD)', '59')
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith(20, expect.objectContaining({
      vin: '1HGBH41JXMN109186', make: 'Toyota', model: 'Camry', dailyPrice: 59,
      branchId: 1, status: 'AVAILABLE', mileage: 12000,
    })))
    expect(mockDeleteImage).toHaveBeenCalledWith(20, 9)
    expect(await screen.findByText('Car updated')).toBeInTheDocument()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('uploads newly selected photos after the car is created', async () => {
    const { onOpenChange } = renderDialog()
    fillRequired()
    await choose('Branch', 'Downtown Branch · New York')
    const file = png('camry.png')

    fireEvent.change(screen.getByLabelText('Choose car images'), { target: { files: [file] } })
    expect(await screen.findByAltText('camry.png')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Add car' }))

    await waitFor(() => expect(mockUpload).toHaveBeenCalledWith(20, [file]))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('refuses more than five photos before sending anything', async () => {
    renderDialog()
    const files = Array.from({ length: 6 }, (_, i) => png(`photo-${i}.png`))

    fireEvent.change(screen.getByLabelText('Choose car images'), { target: { files } })

    expect(await screen.findByRole('alert')).toHaveTextContent('You can add up to 5 images per car')
    expect(mockCreate).not.toHaveBeenCalled()
    expect(mockUpload).not.toHaveBeenCalled()
  })

  it("shows the backend's reason, e.g. a duplicate VIN, and stays open", async () => {
    mockCreate.mockRejectedValue(new Error('Car with VIN already exists: 1HGBH41JXMN109186'))
    const { onOpenChange } = renderDialog()
    fillRequired()
    await choose('Branch', 'Downtown Branch · New York')
    fireEvent.click(screen.getByRole('button', { name: 'Add car' }))

    expect(await screen.findByText('Car with VIN already exists: 1HGBH41JXMN109186')).toBeInTheDocument()
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
    expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Add car' })).toBeEnabled()
  })
})
