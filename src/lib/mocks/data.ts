/**
 * Mock data for MSW handlers
 */

import type { components } from '@/lib/api/schema';

type BranchResponseDto = components['schemas']['BranchResponseDto'];
type CarListResponseDto = components['schemas']['CarListResponseDto'];
type CustomerResponseDto = components['schemas']['CustomerResponseDto'];
type ReservationResponseDto = components['schemas']['ReservationResponseDto'];

// Mock branches
export const mockBranches: BranchResponseDto[] = [
  {
    id: 1,
    name: 'Downtown Branch',
    address: '123 Main Street',
    city: 'New York',
    country: 'USA',
    phone: '+1-555-0101',
    email: 'downtown@rentacar.com',
    openingHours: 'Mon-Fri: 8:00-18:00, Sat-Sun: 9:00-17:00',
    active: true,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 2,
    name: 'Airport Branch',
    address: '456 Airport Road',
    city: 'New York',
    country: 'USA',
    phone: '+1-555-0102',
    email: 'airport@rentacar.com',
    openingHours: '24/7',
    active: true,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 3,
    name: 'Suburban Branch',
    address: '789 Oak Avenue',
    city: 'Brooklyn',
    country: 'USA',
    phone: '+1-555-0103',
    email: 'suburban@rentacar.com',
    openingHours: 'Mon-Fri: 9:00-17:00, Sat: 9:00-15:00, Sun: Closed',
    active: true,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
];

// Mock cars
export const mockCars: CarListResponseDto[] = [
  {
    id: 1,
    vin: 'JH4KA8260MC000001',
    make: 'Toyota',
    model: 'Corolla',
    year: 2023,
    category: 'COMPACT',
    transmission: 'AUTOMATIC',
    fuelType: 'GASOLINE',
    seats: 5,
    status: 'AVAILABLE',
    dailyPrice: 45.99,
    color: 'Silver',
    displayName: '2023 Toyota Corolla',
    branchName: 'Downtown Branch',
  },
  {
    id: 2,
    vin: 'JH4KA8260MC000002',
    make: 'Honda',
    model: 'Civic',
    year: 2023,
    category: 'COMPACT',
    transmission: 'MANUAL',
    fuelType: 'GASOLINE',
    seats: 5,
    status: 'AVAILABLE',
    dailyPrice: 42.99,
    color: 'Blue',
    displayName: '2023 Honda Civic',
    branchName: 'Downtown Branch',
  },
  {
    id: 3,
    vin: 'JH4KA8260MC000003',
    make: 'BMW',
    model: 'X5',
    year: 2023,
    category: 'SUV',
    transmission: 'AUTOMATIC',
    fuelType: 'GASOLINE',
    seats: 7,
    status: 'AVAILABLE',
    dailyPrice: 89.99,
    color: 'Black',
    displayName: '2023 BMW X5',
    branchName: 'Airport Branch',
  },
  {
    id: 4,
    vin: 'JH4KA8260MC000004',
    make: 'Tesla',
    model: 'Model 3',
    year: 2023,
    category: 'PREMIUM',
    transmission: 'AUTOMATIC',
    fuelType: 'ELECTRIC',
    seats: 5,
    status: 'AVAILABLE',
    dailyPrice: 75.99,
    color: 'White',
    displayName: '2023 Tesla Model 3',
    branchName: 'Airport Branch',
  },
  {
    id: 5,
    vin: 'JH4KA8260MC000005',
    make: 'Ford',
    model: 'Transit',
    year: 2022,
    category: 'VAN',
    transmission: 'MANUAL',
    fuelType: 'DIESEL',
    seats: 9,
    status: 'RENTED',
    dailyPrice: 65.99,
    color: 'White',
    displayName: '2022 Ford Transit',
    branchName: 'Suburban Branch',
  },
];

// Mock customers
export const mockCustomers: CustomerResponseDto[] = [
  {
    id: 1,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@email.com',
    phone: '+1-555-1001',
    driverLicenseNo: 'DL123456789',
    dateOfBirth: '1985-06-15',
    address: '123 Elm Street',
    city: 'New York',
    country: 'USA',
    licenseExpiryDate: '2027-06-15',
    fullName: 'John Doe',
    createdAt: '2024-01-10T10:00:00Z',
    updatedAt: '2024-01-10T10:00:00Z',
  },
  {
    id: 2,
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@email.com',
    phone: '+1-555-1002',
    driverLicenseNo: 'DL987654321',
    dateOfBirth: '1990-03-22',
    address: '456 Pine Avenue',
    city: 'Brooklyn',
    country: 'USA',
    licenseExpiryDate: '2026-03-22',
    fullName: 'Jane Smith',
    createdAt: '2024-01-11T10:00:00Z',
    updatedAt: '2024-01-11T10:00:00Z',
  },
  {
    id: 3,
    firstName: 'Michael',
    lastName: 'Johnson',
    email: 'michael.johnson@email.com',
    phone: '+1-555-1003',
    driverLicenseNo: 'DL456789123',
    dateOfBirth: '1982-11-08',
    address: '789 Maple Drive',
    city: 'Queens',
    country: 'USA',
    licenseExpiryDate: '2025-11-08',
    fullName: 'Michael Johnson',
    createdAt: '2024-01-12T10:00:00Z',
    updatedAt: '2024-01-12T10:00:00Z',
  },
];

// Mock reservations
export const mockReservations: ReservationResponseDto[] = [
  {
    id: 1,
    startDate: '2024-02-15',
    endDate: '2024-02-20',
    status: 'CONFIRMED',
    totalPrice: 229.95,
    currency: 'USD',
    notes: 'Business trip rental',
    customer: mockCustomers[0],
    car: mockCars[0],
    pickupBranch: mockBranches[0],
    dropoffBranch: mockBranches[0],
    createdAt: '2024-02-01T10:00:00Z',
    updatedAt: '2024-02-01T10:00:00Z',
    durationDays: 5,
    dailyRate: 45.99,
  },
  {
    id: 2,
    startDate: '2024-02-10',
    endDate: '2024-02-12',
    status: 'PENDING',
    totalPrice: 179.98,
    currency: 'USD',
    notes: 'Weekend getaway',
    customer: mockCustomers[1],
    car: mockCars[2],
    pickupBranch: mockBranches[1],
    dropoffBranch: mockBranches[1],
    createdAt: '2024-02-05T10:00:00Z',
    updatedAt: '2024-02-05T10:00:00Z',
    durationDays: 2,
    dailyRate: 89.99,
  },
  {
    id: 3,
    startDate: '2024-01-25',
    endDate: '2024-01-30',
    status: 'COMPLETED',
    totalPrice: 379.95,
    currency: 'USD',
    notes: 'Family vacation',
    customer: mockCustomers[2],
    car: mockCars[3],
    pickupBranch: mockBranches[0],
    dropoffBranch: mockBranches[2],
    createdAt: '2024-01-20T10:00:00Z',
    updatedAt: '2024-01-30T15:00:00Z',
    durationDays: 5,
    dailyRate: 75.99,
  },
];

// Utility functions for generating mock data
export function generateId(): number {
  return Math.floor(Math.random() * 10000) + 1000;
}

export function generatePaginatedResponse<T>(
  items: T[],
  page: number = 0,
  size: number = 10,
  totalElements?: number
) {
  const total = totalElements ?? items.length;
  const startIndex = page * size;
  const endIndex = Math.min(startIndex + size, items.length);
  const content = items.slice(startIndex, endIndex);
  
  return {
    content,
    number: page,
    size,
    totalElements: total,
    totalPages: Math.ceil(total / size),
    first: page === 0,
    last: page >= Math.ceil(total / size) - 1,
    empty: content.length === 0,
    numberOfElements: content.length,
  };
}

export function delay(ms: number = 500): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
