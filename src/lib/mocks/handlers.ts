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
import { ALL_PERMISSIONS } from '@/lib/auth/permissions';

type CustomerRequestDto = components['schemas']['CustomerRequestDto'];
type BranchResponseDto = components['schemas']['BranchResponseDto'];
type ReservationRequestDto = components['schemas']['ReservationRequestDto'];
type UserResponseDto = components['schemas']['UserResponseDto'];
type UserCreateRequestDto = components['schemas']['UserCreateRequestDto'];
type UserUpdateRequestDto = components['schemas']['UserUpdateRequestDto'];
type UserRole = NonNullable<UserCreateRequestDto['role']>;

// In-memory storage for mocked data (resets on page refresh)
let branches = [...mockBranches];
let cars = [...mockCars];
let customers = [...mockCustomers];
let reservations = [...mockReservations];

type MockCarImage = { id: number; fileName: string; contentType: string; bytes: Uint8Array; position: number };
/** Uploaded photos per car; in the real app the backend keeps them. */
const carImages = new Map<number, MockCarImage[]>();
let nextCarImageId = 1;

// Sign-in mock: the three seeded accounts, and "a session" is just a flag (the real refresh cookie is httpOnly)
const STAFF_PERMISSIONS = ['CUSTOMER_MANAGE', 'RESERVATION_MANAGE', 'MAINTENANCE_SCHEDULE'];
const MANAGER_PERMISSIONS = [...STAFF_PERMISSIONS, 'CUSTOMER_DELETE', 'CAR_MANAGE', 'MAINTENANCE_MANAGE',
  'USER_VIEW', 'USER_CREATE_STAFF'];
const permissionsForRole = (role: UserRole) => role === 'ADMIN' ? [...ALL_PERMISSIONS]
  : role === 'MANAGER' ? [...MANAGER_PERMISSIONS]
    : [...STAFF_PERMISSIONS];

export const MOCK_ADMIN: UserResponseDto = {
  id: 1, username: 'admin', email: 'admin@rentacar.com', firstName: 'System', lastName: 'Administrator',
  enabled: true, roles: ['ADMIN'], permissions: [...ALL_PERMISSIONS],
};
export const MOCK_MANAGER: UserResponseDto = {
  id: 2, username: 'maria.manager', email: 'maria.manager@rentacar.com', firstName: 'Maria', lastName: 'Manager',
  enabled: true, roles: ['MANAGER'], permissions: [...MANAGER_PERMISSIONS],
  branchId: 1, branchName: 'Downtown Branch',
};
export const MOCK_STAFF: UserResponseDto = {
  id: 3, username: 'john.doe', email: 'john.doe@rentacar.com', firstName: 'John', lastName: 'Doe',
  enabled: true, roles: ['STAFF'], permissions: [...STAFF_PERMISSIONS],
  branchId: 1, branchName: 'Downtown Branch',
};
export const MOCK_USERS = [MOCK_ADMIN, MOCK_MANAGER, MOCK_STAFF];

/** The administrator, for tests that just need a signed-in user with every right */
export const MOCK_USER = MOCK_ADMIN;

let mockSession = false;
let mockCurrentUser: UserResponseDto | null = null;
let mockUsers: UserResponseDto[] = MOCK_USERS.map((u) => ({ ...u }));

/** Tests start without a session */
export function resetMockAuth() {
  mockSession = false;
  mockCurrentUser = null;
  mockUsers = MOCK_USERS.map((u) => ({ ...u }));
  carImages.clear();
  nextCarImageId = 1;
}
const loginResponse = (user: UserResponseDto) => ({
  access_token: 'mock-access-token', token_type: 'Bearer', expires_in: 900,
  expires_at: new Date(Date.now() + 900_000).toISOString(), user,
});
const unauthorized = () => HttpResponse.json(
  { title: 'Unauthorized', status: 401, detail: 'Your session has ended. Please sign in again.' }, { status: 401 });
const forbidden = (detail: string) => HttpResponse.json({ title: 'Forbidden', status: 403, detail }, { status: 403 });

let mockSettings: components['schemas']['SettingsResponseDto'] = { mileageUnit: 'KILOMETERS' };

type MaintenanceResponseDto = components['schemas']['MaintenanceResponseDto'];
type MaintenanceScheduleRequestDto = components['schemas']['MaintenanceScheduleRequestDto'];
type MaintenanceUpdateRequestDto = components['schemas']['MaintenanceUpdateRequestDto'];
type MaintenanceCompleteRequestDto = components['schemas']['MaintenanceCompleteRequestDto'];

const daysFromNow = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

function imagesFor(carId?: number) {
  if (carId == null) return [];
  return [...(carImages.get(carId) ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((image) => ({
      id: image.id,
      url: `/api/v1/cars/${carId}/images/${image.id}`,
      fileName: image.fileName,
      contentType: image.contentType,
      sizeBytes: image.bytes.length,
      position: image.position,
    }));
}

/** Car responses carry their photos, like the backend's CarListResponseDto and CarResponseDto. */
function withImages<T extends { id?: number }>(car: T) {
  return { ...car, images: imagesFor(car.id) };
}

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
    return HttpResponse.json({ ...created, images: [] });
  }),

  http.put('/api/v1/cars/:id', async ({ params, request }) => {
    await delay();
    if (!mockSession) return unauthorized();
    if (!mockCurrentUser?.permissions?.includes('CAR_MANAGE')) return forbidden('You do not have permission to edit cars');

    const id = Number(params.id);
    const existing = cars.find((car) => car.id === id);
    if (!existing) {
      return HttpResponse.json({ title: 'Not Found', status: 404, detail: `Car not found: ${id}` }, { status: 404 });
    }

    const body = await request.json() as components['schemas']['CarRequestDto'];
    if (cars.some((car) => car.id !== id && car.vin === body.vin)) {
      return HttpResponse.json(
        { title: 'Conflict', status: 409, detail: `Another car with VIN already exists: ${body.vin}` },
        { status: 409 }
      );
    }
    const branch = branches.find((candidate) => candidate.id === body.branchId);
    const updated = {
      ...existing,
      ...body,
      id,
      status: body.status ?? existing.status,
      displayName: `${body.year} ${body.make} ${body.model}`,
      branchName: branch?.name,
    } as (typeof cars)[number];
    cars = cars.map((car) => (car.id === id ? updated : car));
    return HttpResponse.json(withImages(updated));
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

    // Like the backend: vin and year match exactly, make and model partially (case-insensitive)
    const vin = url.searchParams.get('vin');
    const make = url.searchParams.get('make');
    const model = url.searchParams.get('model');
    const year = url.searchParams.get('year');
    if (vin) filteredCars = filteredCars.filter(car => car.vin === vin);
    if (make) filteredCars = filteredCars.filter(car => car.make?.toLowerCase().includes(make.toLowerCase()));
    if (model) filteredCars = filteredCars.filter(car => car.model?.toLowerCase().includes(model.toLowerCase()));
    if (year) filteredCars = filteredCars.filter(car => car.year === Number(year));

    if (category) {
      filteredCars = filteredCars.filter(car => car.category === category);
    }

    if (transmission) {
      filteredCars = filteredCars.filter(car => car.transmission === transmission);
    }

    if (fuelType) {
      filteredCars = filteredCars.filter(car => car.fuelType === fuelType);
    }

    const response = generatePaginatedResponse(filteredCars.map(withImages), page, size);
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

    const response = generatePaginatedResponse(availableCars.map(withImages), page, size);
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

    return HttpResponse.json(withImages(car));
  }),

  // Car photos: up to 5 per car, 5 MB each, JPEG/PNG/WebP (same rules as the backend)
  http.post('/api/v1/cars/:id/images', async ({ params, request }) => {
    await delay();
    if (!mockSession) return unauthorized();
    if (!mockCurrentUser?.permissions?.includes('CAR_MANAGE')) return forbidden('You do not have permission to add car photos');

    const carId = Number(params.id);
    if (!cars.some((car) => car.id === carId)) {
      return HttpResponse.json({ title: 'Not Found', status: 404, detail: `Car not found: ${carId}` }, { status: 404 });
    }

    const form = await request.formData();
    const files = form.getAll('files').filter((entry): entry is File => entry instanceof File);
    if (files.length === 0) {
      return HttpResponse.json({ title: 'Bad Request', status: 400, detail: 'Choose at least one image' }, { status: 400 });
    }
    const existing = carImages.get(carId) ?? [];
    if (existing.length + files.length > 5) {
      return HttpResponse.json({ title: 'Bad Request', status: 400, detail: 'A car can have at most 5 images' }, { status: 400 });
    }
    for (const file of files) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        return HttpResponse.json({ title: 'Bad Request', status: 400, detail: 'Images must be JPEG, PNG or WebP' }, { status: 400 });
      }
      if (file.size > 5 * 1024 * 1024) {
        return HttpResponse.json({ title: 'Bad Request', status: 400, detail: 'Each image must be 5 MB or smaller' }, { status: 400 });
      }
    }

    const start = existing.length ? Math.max(...existing.map((image) => image.position)) + 1 : 0;
    const added: MockCarImage[] = [];
    for (const [index, file] of files.entries()) {
      added.push({
        id: nextCarImageId++,
        fileName: file.name,
        contentType: file.type,
        bytes: new Uint8Array(await file.arrayBuffer()),
        position: start + index,
      });
    }
    carImages.set(carId, [...existing, ...added]);
    return HttpResponse.json(imagesFor(carId));
  }),

  http.delete('/api/v1/cars/:carId/images/:imageId', ({ params }) => {
    if (!mockSession) return unauthorized();
    if (!mockCurrentUser?.permissions?.includes('CAR_MANAGE')) return forbidden('You do not have permission to remove car photos');

    const carId = Number(params.carId);
    const imageId = Number(params.imageId);
    const existing = carImages.get(carId) ?? [];
    if (!existing.some((image) => image.id === imageId)) {
      return HttpResponse.json({ title: 'Not Found', status: 404, detail: 'Image not found' }, { status: 404 });
    }
    // Keep positions contiguous, as the backend does
    carImages.set(carId, existing
      .filter((image) => image.id !== imageId)
      .map((image, position) => ({ ...image, position })));
    return new HttpResponse(null, { status: 204 });
  }),

  // Public so a plain <img> can load it, like the backend
  http.get('/api/v1/cars/:carId/images/:imageId', ({ params }) => {
    const image = (carImages.get(Number(params.carId)) ?? [])
      .find((candidate) => candidate.id === Number(params.imageId));
    if (!image) {
      return HttpResponse.json({ title: 'Not Found', status: 404, detail: 'Image not found' }, { status: 404 });
    }
    return new HttpResponse(new Blob([image.bytes], { type: image.contentType }), {
      headers: { 'Content-Type': image.contentType, 'Cache-Control': 'public, max-age=604800' },
    });
  }),

  // Auth endpoints (every seeded account uses admin123)
  http.post('/api/v1/auth/login', async ({ request }) => {
    const body = await request.json() as { username?: string; password?: string };
    const who = body?.username?.trim().toLowerCase();
    const user = mockUsers.find((u) => u.enabled !== false
      && (u.username?.toLowerCase() === who || u.email?.toLowerCase() === who));
    if (user && body?.password === 'admin123') {
      mockSession = true;
      mockCurrentUser = user;
      return HttpResponse.json(loginResponse(user));
    }
    return HttpResponse.json({ title: 'Unauthorized', status: 401, detail: 'Invalid username or password' }, { status: 401 });
  }),

  http.post('/api/v1/auth/refresh', () => {
    if (!mockSession || !mockCurrentUser) {
      return unauthorized();
    }
    return HttpResponse.json(loginResponse(mockCurrentUser));
  }),

  http.post('/api/v1/auth/logout', () => {
    mockSession = false;
    mockCurrentUser = null;
    return new HttpResponse(null, { status: 204 });
  }),

  http.post('/api/v1/auth/change-password', async ({ request }) => {
    if (!mockSession) return unauthorized();
    const body = await request.json() as { currentPassword?: string; newPassword?: string };
    if (body?.currentPassword !== 'admin123') {
      return HttpResponse.json({ title: 'Bad Request', status: 400, detail: 'Current password is incorrect' }, { status: 400 });
    }
    if (!body?.newPassword || body.newPassword.length < 8) {
      return HttpResponse.json({ title: 'Bad Request', status: 400, detail: 'New password must have at least 8 characters' }, { status: 400 });
    }
    return new HttpResponse(null, { status: 204 });
  }),

  // User accounts: managers can look and create staff; the rest is administrator-only
  http.get('/api/v1/users', async ({ request }) => {
    await delay();
    if (!mockSession) return unauthorized();
    if (!mockCurrentUser?.permissions?.includes('USER_VIEW')) return forbidden('You do not have permission to view users');

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '0');
    const size = parseInt(url.searchParams.get('size') || '20');
    const search = (url.searchParams.get('search') || '').trim().toLowerCase();
    const role = url.searchParams.get('role');

    const matches = mockUsers
      .filter((u) => !role || u.roles?.[0] === role)
      .filter((u) => !search
        || (u.username ?? '').toLowerCase().includes(search)
        || (u.email ?? '').toLowerCase().includes(search)
        || `${u.firstName ?? ''} ${u.lastName ?? ''}`.toLowerCase().includes(search));
    return HttpResponse.json(generatePaginatedResponse(matches, page, size));
  }),

  http.post('/api/v1/users', async ({ request }) => {
    await delay();
    if (!mockSession) return unauthorized();
    if (!mockCurrentUser?.permissions?.includes('USER_CREATE_STAFF')) return forbidden('You do not have permission to create users');

    const body = await request.json() as UserCreateRequestDto;
    if (body.role !== 'STAFF' && !mockCurrentUser.permissions?.includes('USER_MANAGE')) {
      return forbidden('Managers can only create staff accounts');
    }
    const branch = body.branchId != null ? branches.find((b) => b.id === body.branchId) : undefined;
    if (body.role !== 'ADMIN' && !branch) {
      return HttpResponse.json({ title: 'Bad Request', status: 400, detail: 'Staff and managers need a branch' }, { status: 400 });
    }
    if (body.branchId != null && !branch) {
      return HttpResponse.json({ title: 'Not Found', status: 404, detail: 'Branch not found' }, { status: 404 });
    }
    if (mockUsers.some((u) => u.username === body.username || u.email === body.email)) {
      return HttpResponse.json({ title: 'Conflict', status: 409, detail: 'Username or email already in use' }, { status: 409 });
    }

    const { password: _password, ...rest } = body;
    const now = new Date().toISOString();
    const created: UserResponseDto = {
      ...rest, id: generateId(), enabled: true, roles: [body.role], permissions: permissionsForRole(body.role),
      branchName: branch?.name, createdAt: now, updatedAt: now,
    };
    mockUsers.push(created);
    return HttpResponse.json(created, { status: 201 });
  }),

  http.get('/api/v1/users/:id', async ({ params }) => {
    await delay();
    if (!mockSession) return unauthorized();
    const found = mockUsers.find((u) => u.id === Number(params.id));
    return found
      ? HttpResponse.json(found)
      : HttpResponse.json({ title: 'Not Found', status: 404, detail: 'User not found' }, { status: 404 });
  }),

  http.put('/api/v1/users/:id', async ({ params, request }) => {
    await delay();
    if (!mockSession) return unauthorized();
    if (!mockCurrentUser?.permissions?.includes('USER_MANAGE')) return forbidden('You do not have permission to change users');

    const id = Number(params.id);
    const existing = mockUsers.find((u) => u.id === id);
    if (!existing) return HttpResponse.json({ title: 'Not Found', status: 404, detail: 'User not found' }, { status: 404 });

    const body = await request.json() as UserUpdateRequestDto;
    if (body.role !== 'ADMIN' && body.branchId == null) {
      return HttpResponse.json({ title: 'Bad Request', status: 400, detail: 'Staff and managers need a branch' }, { status: 400 });
    }
    if (id === mockCurrentUser.id && (body.enabled === false || body.role !== 'ADMIN')) {
      return HttpResponse.json({ title: 'Conflict', status: 409, detail: 'You cannot disable or demote yourself' }, { status: 409 });
    }
    const branch = body.branchId != null ? branches.find((b) => b.id === body.branchId) : undefined;
    if (body.branchId != null && !branch) {
      return HttpResponse.json({ title: 'Not Found', status: 404, detail: 'Branch not found' }, { status: 404 });
    }

    // Like the backend: a branch can be changed but not removed, so leaving it out keeps the current one
    const updated: UserResponseDto = {
      ...existing, ...body, updatedAt: new Date().toISOString(),
      roles: [body.role], permissions: permissionsForRole(body.role),
      branchId: branch ? branch.id : existing.branchId, branchName: branch ? branch.name : existing.branchName,
    };
    mockUsers = mockUsers.map((u) => (u.id === id ? updated : u));
    if (id === mockCurrentUser.id) mockCurrentUser = updated;
    return HttpResponse.json(updated);
  }),

  http.post('/api/v1/users/:id/reset-password', async ({ params, request }) => {
    await delay();
    if (!mockSession) return unauthorized();
    if (!mockCurrentUser?.permissions?.includes('USER_MANAGE')) return forbidden('You do not have permission to reset passwords');

    const id = Number(params.id);
    if (!mockUsers.some((u) => u.id === id)) {
      return HttpResponse.json({ title: 'Not Found', status: 404, detail: 'User not found' }, { status: 404 });
    }
    const body = await request.json() as { newPassword?: string };
    if (!body?.newPassword || body.newPassword.length < 8) {
      return HttpResponse.json({ title: 'Bad Request', status: 400, detail: 'New password must have at least 8 characters' }, { status: 400 });
    }
    return new HttpResponse(null, { status: 204 });
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
    mockSettings = { mileageUnit: body.mileageUnit, defaultBranchId: body.defaultBranchId };
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
