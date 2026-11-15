import { http, HttpResponse } from 'msw';
import {
  mockBranches,
  mockCars,
  mockCustomers,
  mockReservations,
  generateId,
  generatePaginatedResponse,
  delay,
} from './data';
import type { components } from '@/lib/api/schema';

type CustomerRequestDto = components['schemas']['CustomerRequestDto'];
type BranchResponseDto = components['schemas']['BranchResponseDto'];
type ReservationRequestDto = components['schemas']['ReservationRequestDto'];

// In-memory storage for mocked data (resets on page refresh)
let branches = [...mockBranches];
let cars = [...mockCars];
let customers = [...mockCustomers];
let reservations = [...mockReservations];

let mockSettings: components['schemas']['SettingsResponseDto'] = { mileageUnit: 'KILOMETERS' };

type MaintenanceResponseDto = components['schemas']['MaintenanceResponseDto'];
type MaintenanceScheduleRequestDto = components['schemas']['MaintenanceScheduleRequestDto'];
type MaintenanceUpdateRequestDto = components['schemas']['MaintenanceUpdateRequestDto'];
type MaintenanceCompleteRequestDto = components['schemas']['MaintenanceCompleteRequestDto'];

const daysFromNow = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

let maintenanceJobs: MaintenanceResponseDto[] = [
  { id: 9001, car: mockCars[0], maintenanceType: 'ROUTINE', description: 'Oil and filter change',
    scheduledDate: daysFromNow(5), status: 'SCHEDULED', cost: 120, currency: 'USD' },
  { id: 9002, car: mockCars[1], maintenanceType: 'REPAIR', description: 'Front brake pads replacement',
    scheduledDate: daysFromNow(-1), status: 'IN_PROGRESS', cost: 320, currency: 'USD' },
  { id: 9003, car: mockCars[2], maintenanceType: 'RECALL', description: 'Safety recall: airbag inflator',
    scheduledDate: daysFromNow(2), status: 'SCHEDULED', currency: 'USD' },
  { id: 9004, car: mockCars[0], maintenanceType: 'INSPECTION', description: 'Annual safety inspection',
    scheduledDate: daysFromNow(-40), completedDate: daysFromNow(-40), status: 'COMPLETED', cost: 60,
    currency: 'USD', odometerReading: 14000 },
];

/** Applies a change to a job if it is in the expected status, like the backend's state checks (409 otherwise). */
function updateJob(id: number, requiredStatus: MaintenanceResponseDto['status'], changes: Partial<MaintenanceResponseDto>) {
  const job = maintenanceJobs.find(m => m.id === id);
  if (!job) return HttpResponse.json({ detail: 'Maintenance not found' }, { status: 404 });
  if (job.status !== requiredStatus) {
    return HttpResponse.json({ detail: `Not allowed in status ${job.status}` }, { status: 409 });
  }
  const updated = { ...job, ...changes };
  maintenanceJobs = maintenanceJobs.map(m => (m.id === id ? updated : m));
  return HttpResponse.json(updated);
}

export const handlers = [
  // Branch endpoints
  http.get('/api/v1/branches', async ({ request }) => {
    await delay();

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '0');
    const size = parseInt(url.searchParams.get('size') || '10');

    const response = generatePaginatedResponse(branches, page, size);
    return HttpResponse.json(response);
  }),

  // Like the backend: partial, case-insensitive match on name and/or city; blank filters are ignored
  http.get('/api/v1/branches/search', async ({ request }) => {
    await delay();

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '0');
    const size = parseInt(url.searchParams.get('size') || '10');
    const name = (url.searchParams.get('name') || '').trim().toLowerCase();
    const city = (url.searchParams.get('city') || '').trim().toLowerCase();

    const matches = branches
      .filter(b => !name || (b.name ?? '').toLowerCase().includes(name))
      .filter(b => !city || (b.city ?? '').toLowerCase().includes(city));
    return HttpResponse.json(generatePaginatedResponse(matches, page, size));
  }),

  http.post('/api/v1/branches', async ({ request }) => {
    await delay();

    const body = await request.json() as components['schemas']['BranchRequestDto'];
    if (branches.some(b => b.name === body.name && b.city === body.city)) {
      return HttpResponse.json(
        { title: 'Bad Request', status: 400, detail: 'Branch with the same name already exists in this city' },
        { status: 400 }
      );
    }
    const now = new Date().toISOString();
    const created: BranchResponseDto = { ...body, id: generateId(), active: body.active ?? true, createdAt: now, updatedAt: now };
    branches = [...branches, created];
    return HttpResponse.json(created);
  }),

  http.put('/api/v1/branches/:id', async ({ params, request }) => {
    await delay();

    const id = parseInt(params.id as string);
    const body = await request.json() as components['schemas']['BranchRequestDto'];
    const existing = branches.find(b => b.id === id);
    if (!existing) {
      return HttpResponse.json({ title: 'Not Found', status: 404, detail: `Branch not found: ${id}` }, { status: 404 });
    }
    // Leaving `active` out keeps the status, like the backend
    const updated: BranchResponseDto = {
      ...existing, ...body, id, active: body.active ?? existing.active, updatedAt: new Date().toISOString(),
    };
    branches = branches.map(b => (b.id === id ? updated : b));
    return HttpResponse.json(updated);
  }),

  // Car endpoints
  http.post('/api/v1/cars', async ({ request }) => {
    await delay();

    const body = await request.json() as components['schemas']['CarRequestDto'];
    if (cars.some(c => c.vin === body.vin)) {
      return HttpResponse.json(
        { title: 'Conflict', status: 409, detail: `Car with VIN already exists: ${body.vin}` },
        { status: 409 }
      );
    }
    const branch = branches.find(b => b.id === body.branchId);
    const created = {
      ...body,
      id: generateId(),
      status: body.status ?? 'AVAILABLE',
      displayName: `${body.year} ${body.make} ${body.model}`,
      branchName: branch?.name,
    };
    cars = [...cars, created as (typeof cars)[number]];
    return HttpResponse.json(created);
  }),

  http.get('/api/v1/cars', async ({ request }) => {
    await delay();

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '0');
    const size = parseInt(url.searchParams.get('size') || '10');
    const search = url.searchParams.get('search');
    const category = url.searchParams.get('category');
    const transmission = url.searchParams.get('transmission');
    const fuelType = url.searchParams.get('fuelType');

    let filteredCars = [...cars];

    if (search) {
      const searchLower = search.toLowerCase();
      filteredCars = filteredCars.filter(car =>
        car.make?.toLowerCase().includes(searchLower) ||
        car.model?.toLowerCase().includes(searchLower) ||
        car.displayName?.toLowerCase().includes(searchLower)
      );
    }

    if (category) {
      filteredCars = filteredCars.filter(car => car.category === category);
    }

    if (transmission) {
      filteredCars = filteredCars.filter(car => car.transmission === transmission);
    }

    if (fuelType) {
      filteredCars = filteredCars.filter(car => car.fuelType === fuelType);
    }

    const response = generatePaginatedResponse(filteredCars, page, size);
    return HttpResponse.json(response);
  }),

  http.get('/api/v1/cars/available', async ({ request }) => {
    await delay();

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '0');
    const size = parseInt(url.searchParams.get('size') || '10');

    // Filter available cars (not rented and not in maintenance)
    let availableCars = cars.filter(car =>
      car.status === 'AVAILABLE' || car.status === 'RENTED'
    );

    // In a real scenario, we'd check for overlapping reservations
    // For mock purposes, we'll just return available cars
    availableCars = availableCars.filter(car => car.status === 'AVAILABLE');

    const response = generatePaginatedResponse(availableCars, page, size);
    return HttpResponse.json(response);
  }),

  http.get('/api/v1/cars/:id', async ({ params }) => {
    await delay();

    const id = parseInt(params.id as string);
    const car = cars.find(c => c.id === id);

    if (!car) {
      return HttpResponse.json(
        { message: 'Car not found' },
        { status: 404 }
      );
    }

    return HttpResponse.json(car);
  }),

  // Settings endpoints
  http.get('/api/v1/settings', async () => {
    await delay();
    return HttpResponse.json(mockSettings);
  }),

  http.put('/api/v1/settings', async ({ request }) => {
    await delay();
    const body = await request.json() as components['schemas']['SettingsRequestDto'];
    if (body?.mileageUnit !== 'KILOMETERS' && body?.mileageUnit !== 'MILES') {
      return HttpResponse.json({ title: 'Validation Failed', status: 400 }, { status: 400 });
    }
    mockSettings = { mileageUnit: body.mileageUnit };
    return HttpResponse.json(mockSettings);
  }),

  // Maintenance endpoints (simplified: no reservation conflict checks)
  http.get('/api/v1/maintenance/due-cars', async () => {
    await delay();
    return HttpResponse.json([]);
  }),

  http.get('/api/v1/maintenance', async ({ request }) => {
    await delay();
    const url = new URL(request.url);
    const q = (name: string) => url.searchParams.get(name);
    const filtered = maintenanceJobs
      .filter(m => !q('status') || m.status === q('status'))
      .filter(m => !q('maintenanceType') || m.maintenanceType === q('maintenanceType'))
      .filter(m => !q('carId') || m.car?.id === Number(q('carId')))
      .filter(m => !q('startDate') || m.scheduledDate! >= q('startDate')!)
      .filter(m => !q('endDate') || m.scheduledDate! <= q('endDate')!)
      .sort((a, b) => b.scheduledDate!.localeCompare(a.scheduledDate!));
    return HttpResponse.json(generatePaginatedResponse(filtered,
      parseInt(q('page') || '0'), parseInt(q('size') || '10')));
  }),

  http.get('/api/v1/maintenance/:id', async ({ params }) => {
    await delay();
    const job = maintenanceJobs.find(m => m.id === Number(params.id));
    return job
      ? HttpResponse.json(job)
      : HttpResponse.json({ detail: 'Maintenance not found' }, { status: 404 });
  }),

  http.post('/api/v1/maintenance/schedule', async ({ request }) => {
    await delay();
    const body = await request.json() as MaintenanceScheduleRequestDto;
    const car = cars.find(c => c.id === body.carId);
    if (!car) return HttpResponse.json({ detail: 'Car not found' }, { status: 404 });
    const job: MaintenanceResponseDto = {
      id: generateId(), car, maintenanceType: body.type, description: body.description,
      scheduledDate: body.scheduledDate, cost: body.cost, currency: 'USD', notes: body.notes, status: 'SCHEDULED',
    };
    maintenanceJobs.push(job);
    return HttpResponse.json(job);
  }),

  http.put('/api/v1/maintenance/:id', async ({ params, request }) => {
    await delay();
    const body = await request.json() as MaintenanceUpdateRequestDto;
    return updateJob(Number(params.id), 'SCHEDULED', {
      maintenanceType: body.type, description: body.description, scheduledDate: body.scheduledDate,
      cost: body.cost, notes: body.notes,
    });
  }),

  http.post('/api/v1/maintenance/:id/start', async ({ params }) => {
    await delay();
    return updateJob(Number(params.id), 'SCHEDULED', { status: 'IN_PROGRESS' });
  }),

  http.post('/api/v1/maintenance/:id/complete', async ({ params, request }) => {
    await delay();
    const body = (await request.json().catch(() => null)) as MaintenanceCompleteRequestDto | null;
    return updateJob(Number(params.id), 'IN_PROGRESS', {
      status: 'COMPLETED', completedDate: new Date().toISOString().slice(0, 10),
      ...(body?.cost != null && { cost: body.cost }),
      ...(body?.notes != null && { notes: body.notes }),
      ...(body?.odometerReading != null && { odometerReading: body.odometerReading }),
    });
  }),

  http.post('/api/v1/maintenance/:id/cancel', async ({ params }) => {
    await delay();
    const job = maintenanceJobs.find(m => m.id === Number(params.id));
    return updateJob(Number(params.id), job?.status === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'SCHEDULED',
      { status: 'CANCELLED' });
  }),

  // Customer endpoints
  http.get('/api/v1/customers', async ({ request }) => {
    await delay();

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '0');
    const size = parseInt(url.searchParams.get('size') || '10');
    const search = url.searchParams.get('search');

    let filteredCustomers = [...customers];

    if (search) {
      const searchLower = search.toLowerCase();
      filteredCustomers = filteredCustomers.filter(customer =>
        customer.firstName?.toLowerCase().includes(searchLower) ||
        customer.lastName?.toLowerCase().includes(searchLower) ||
        customer.email?.toLowerCase().includes(searchLower) ||
        customer.phone?.toLowerCase().includes(searchLower)
      );
    }

    const response = generatePaginatedResponse(filteredCustomers, page, size);
    return HttpResponse.json(response);
  }),

  // Enhanced customer search endpoint
  http.get('/api/v1/customers/searchany', async ({ request }) => {
    await delay();

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '0');
    const size = parseInt(url.searchParams.get('size') || '10');
    const search = url.searchParams.get('search');

    let filteredCustomers = [...customers];

    if (search) {
      const searchLower = search.toLowerCase();
      filteredCustomers = filteredCustomers.filter(customer =>
        customer.firstName?.toLowerCase().includes(searchLower) ||
        customer.lastName?.toLowerCase().includes(searchLower) ||
        customer.email?.toLowerCase().includes(searchLower) ||
        customer.phone?.toLowerCase().includes(searchLower) ||
        customer.city?.toLowerCase().includes(searchLower) ||
        customer.driverLicenseNo?.toLowerCase().includes(searchLower)
      );
    }

    const response = generatePaginatedResponse(filteredCustomers, page, size);
    return HttpResponse.json(response);
  }),

  http.get('/api/v1/customers/:id', async ({ params }) => {
    await delay();

    const id = parseInt(params.id as string);
    const customer = customers.find(c => c.id === id);

    if (!customer) {
      return HttpResponse.json(
        { message: 'Customer not found' },
        { status: 404 }
      );
    }

    return HttpResponse.json(customer);
  }),

  http.post('/api/v1/customers', async ({ request }) => {
    await delay();

    const customerData = await request.json() as CustomerRequestDto;

    // Basic validation
    if (!customerData.firstName || !customerData.lastName || !customerData.email) {
      return HttpResponse.json(
        {
          message: 'Validation failed',
          violations: [
            { field: 'firstName', message: 'First name is required' },
            { field: 'lastName', message: 'Last name is required' },
            { field: 'email', message: 'Email is required' },
          ]
        },
        { status: 400 }
      );
    }

    const newCustomer = {
      id: generateId(),
      ...customerData,
      fullName: `${customerData.firstName} ${customerData.lastName}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    customers.push(newCustomer);
    return HttpResponse.json(newCustomer, { status: 201 });
  }),

  http.put('/api/v1/customers/:id', async ({ params, request }) => {
    await delay();

    const id = parseInt(params.id as string);
    const customerData = await request.json() as CustomerRequestDto;

    const customerIndex = customers.findIndex(c => c.id === id);
    if (customerIndex === -1) {
      return HttpResponse.json(
        { message: 'Customer not found' },
        { status: 404 }
      );
    }

    const updatedCustomer = {
      ...customers[customerIndex],
      ...customerData,
      fullName: `${customerData.firstName} ${customerData.lastName}`,
      updatedAt: new Date().toISOString(),
    };

    customers[customerIndex] = updatedCustomer;
    return HttpResponse.json(updatedCustomer);
  }),

  // Reservation endpoints
  http.get('/api/v1/reservations', async ({ request }) => {
    await delay();

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '0');
    const size = parseInt(url.searchParams.get('size') || '10');
    const customerId = url.searchParams.get('customerId');
    const status = url.searchParams.get('status');

    let filteredReservations = [...reservations];

    if (customerId) {
      filteredReservations = filteredReservations.filter(r =>
        r.customer?.id === parseInt(customerId)
      );
    }

    if (status) {
      filteredReservations = filteredReservations.filter(r => r.status === status);
    }

    const response = generatePaginatedResponse(filteredReservations, page, size);
    return HttpResponse.json(response);
  }),

  http.get('/api/v1/reservations/:id', async ({ params }) => {
    await delay();

    const id = parseInt(params.id as string);
    const reservation = reservations.find(r => r.id === id);

    if (!reservation) {
      return HttpResponse.json(
        { message: 'Reservation not found' },
        { status: 404 }
      );
    }

    return HttpResponse.json(reservation);
  }),

  http.post('/api/v1/reservations', async ({ request }) => {
    await delay();

    const reservationData = await request.json() as ReservationRequestDto;

    // Find customer and car
    const customer = customers.find(c => c.id === reservationData.customerId);
    const car = cars.find(c => c.id === reservationData.carId);
    const pickupBranch = branches.find(b => b.id === reservationData.pickupBranchId);
    const dropoffBranch = branches.find(b => b.id === reservationData.dropoffBranchId);

    if (!customer || !car || !pickupBranch || !dropoffBranch) {
      return HttpResponse.json(
        { message: 'Invalid customer, car, or branch ID' },
        { status: 400 }
      );
    }

    // Calculate duration and total price
    const startDate = new Date(reservationData.startDate);
    const endDate = new Date(reservationData.endDate);
    // Same-day rental counts as 1 day (matches the backend)
    const durationDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const totalPrice = (car.dailyPrice || 0) * durationDays;

    const newReservation = {
      id: generateId(),
      startDate: reservationData.startDate,
      endDate: reservationData.endDate,
      status: 'PENDING' as const,
      totalPrice,
      currency: 'USD',
      notes: reservationData.notes,
      customer,
      car,
      pickupBranch,
      dropoffBranch,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      durationDays,
      dailyRate: car.dailyPrice,
    };

    reservations.push(newReservation);
    return HttpResponse.json(newReservation, { status: 201 });
  }),

  // Reservation status change endpoints
  http.post('/api/v1/reservations/:id/confirm', async ({ params }) => {
    await delay();

    const id = parseInt(params.id as string);
    const reservationIndex = reservations.findIndex(r => r.id === id);

    if (reservationIndex === -1) {
      return HttpResponse.json(
        { message: 'Reservation not found' },
        { status: 404 }
      );
    }

    reservations[reservationIndex] = {
      ...reservations[reservationIndex],
      status: 'CONFIRMED',
      updatedAt: new Date().toISOString(),
    };

    return HttpResponse.json(reservations[reservationIndex]);
  }),

  http.post('/api/v1/reservations/:id/cancel', async ({ params }) => {
    await delay();

    const id = parseInt(params.id as string);
    const reservationIndex = reservations.findIndex(r => r.id === id);

    if (reservationIndex === -1) {
      return HttpResponse.json(
        { message: 'Reservation not found' },
        { status: 404 }
      );
    }

    reservations[reservationIndex] = {
      ...reservations[reservationIndex],
      status: 'CANCELLED',
      updatedAt: new Date().toISOString(),
    };

    return HttpResponse.json(reservations[reservationIndex]);
  }),

  // Pick-up and return (simplified: no date or car status checks)
  http.post('/api/v1/reservations/:id/pickup', async ({ params, request }) => {
    await delay();

    const id = parseInt(params.id as string);
    const reservationIndex = reservations.findIndex(r => r.id === id);
    if (reservationIndex === -1) {
      return HttpResponse.json({ detail: 'Reservation not found' }, { status: 404 });
    }
    if (reservations[reservationIndex].status !== 'CONFIRMED') {
      return HttpResponse.json({ detail: 'Only CONFIRMED reservations can be picked up' }, { status: 409 });
    }

    const body = (await request.json().catch(() => null)) as { mileageOut?: number } | null;
    reservations[reservationIndex] = {
      ...reservations[reservationIndex],
      status: 'ACTIVE',
      mileageOut: body?.mileageOut,
      pickedUpAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return HttpResponse.json(reservations[reservationIndex]);
  }),

  http.post('/api/v1/reservations/:id/complete', async ({ params, request }) => {
    await delay();

    const id = parseInt(params.id as string);
    const reservationIndex = reservations.findIndex(r => r.id === id);
    if (reservationIndex === -1) {
      return HttpResponse.json({ detail: 'Reservation not found' }, { status: 404 });
    }
    if (reservations[reservationIndex].status !== 'ACTIVE') {
      return HttpResponse.json({ detail: 'Reservation cannot be completed in current status: '
        + reservations[reservationIndex].status }, { status: 409 });
    }

    const body = (await request.json().catch(() => null)) as { mileageIn?: number } | null;
    reservations[reservationIndex] = {
      ...reservations[reservationIndex],
      status: 'COMPLETED',
      mileageIn: body?.mileageIn,
      returnedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return HttpResponse.json(reservations[reservationIndex]);
  }),
];
