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
type ReservationRequestDto = components['schemas']['ReservationRequestDto'];

// In-memory storage for mocked data (resets on page refresh)
let branches = [...mockBranches];
let cars = [...mockCars];
let customers = [...mockCustomers];
let reservations = [...mockReservations];

export const handlers = [
  // Branch endpoints
  http.get('/api/branches', async ({ request }) => {
    await delay();

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '0');
    const size = parseInt(url.searchParams.get('size') || '10');

    const response = generatePaginatedResponse(branches, page, size);
    return HttpResponse.json(response);
  }),

  // Car endpoints
  http.get('/api/cars', async ({ request }) => {
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

  http.get('/api/cars/available', async ({ request }) => {
    await delay();

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '0');
    const size = parseInt(url.searchParams.get('size') || '10');
    const branchId = url.searchParams.get('branchId');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

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

  http.get('/api/cars/:id', async ({ params }) => {
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

  // Customer endpoints
  http.get('/api/customers', async ({ request }) => {
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
  http.get('/api/customers/searchany', async ({ request }) => {
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

  http.get('/api/customers/:id', async ({ params }) => {
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

  http.post('/api/customers', async ({ request }) => {
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

  http.put('/api/customers/:id', async ({ params, request }) => {
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
  http.get('/api/reservations', async ({ request }) => {
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

  http.get('/api/reservations/:id', async ({ params }) => {
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

  http.post('/api/reservations', async ({ request }) => {
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
    const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
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
  http.post('/api/reservations/:id/confirm', async ({ params }) => {
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

  http.post('/api/reservations/:id/cancel', async ({ params }) => {
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

  http.post('/api/reservations/:id/complete', async ({ params }) => {
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
      status: 'COMPLETED',
      updatedAt: new Date().toISOString(),
    };

    return HttpResponse.json(reservations[reservationIndex]);
  }),
];
