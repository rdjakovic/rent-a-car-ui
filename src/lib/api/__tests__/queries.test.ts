import { vi, describe, it, expect, beforeEach } from 'vitest';
import * as queries from '../queries';
import { api } from '@/lib/api/client';

// Mock the API client
vi.mock('@/lib/api/client', () => {
  return {
    api: {
      POST: vi.fn(),
      PUT: vi.fn(),
      GET: vi.fn(),
    }
  };
});

describe('API Queries', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  describe('Branch Queries', () => {
    it('should list branches', async () => {
      const mockResponse = {
        data: {
          content: [
            { id: 1, name: 'Downtown Branch' },
            { id: 2, name: 'Airport Branch' }
          ],
          totalElements: 2
        },
        response: new Response(null, { status: 200 })
      };
      
      (api.GET as vi.Mock).mockResolvedValue(mockResponse);

      const result = await queries.listBranches({ page: 0, size: 10 });
      
      expect(api.GET).toHaveBeenCalledWith('/api/branches', { params: { query: { page: 0, size: 10 } } });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('Car Queries', () => {
    it('should list cars', async () => {
      const mockResponse = {
        data: {
          content: [
            { id: 1, make: 'Toyota', model: 'Corolla' },
            { id: 2, make: 'Honda', model: 'Civic' }
          ],
          totalElements: 2
        },
        response: new Response(null, { status: 200 })
      };
      
      (api.GET as vi.Mock).mockResolvedValue(mockResponse);

      const result = await queries.listCars({ page: 0, size: 10 });
      
      expect(api.GET).toHaveBeenCalledWith('/api/cars', { params: { query: { page: 0, size: 10 } } });
      expect(result).toEqual(mockResponse.data);
    });

    it('should find available cars', async () => {
      const mockResponse = {
        data: {
          content: [
            { id: 1, make: 'Toyota', model: 'Corolla', status: 'AVAILABLE' }
          ],
          totalElements: 1
        },
        response: new Response(null, { status: 200 })
      };
      
      (api.GET as vi.Mock).mockResolvedValue(mockResponse);

      const params = {
        branchId: 1,
        startDate: '2024-03-01',
        endDate: '2024-03-10'
      };
      
      const result = await queries.findAvailableCars(params);
      
      expect(api.GET).toHaveBeenCalledWith('/api/cars/available', { params: { query: params } });
      expect(result).toEqual(mockResponse.data);
    });

    it('should get car by ID', async () => {
      const mockResponse = {
        data: { id: 1, make: 'Toyota', model: 'Corolla' },
        response: new Response(null, { status: 200 })
      };
      
      (api.GET as vi.Mock).mockResolvedValue(mockResponse);

      const result = await queries.getCarById(1);
      
      expect(api.GET).toHaveBeenCalledWith('/api/cars/{id}', { params: { path: { id: 1 } } });
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle car not found', async () => {
      const mockError = {
        error: { message: 'Car not found', status: 404 },
        response: new Response(null, { status: 404 })
      };
      
      (api.GET as vi.Mock).mockResolvedValue(mockError);

      await expect(queries.getCarById(999)).rejects.toThrow();
      expect(api.GET).toHaveBeenCalledWith('/api/cars/{id}', { params: { path: { id: 999 } } });
    });

    it('should create a new car', async () => {
      const mockNewCar = {
        vin: 'JH4KA8260MC000006',
        make: 'Audi',
        model: 'A4',
        year: 2023,
        category: 'PREMIUM' as const,
        transmission: 'AUTOMATIC' as const,
        fuelType: 'GASOLINE' as const,
        seats: 5,
        dailyPrice: 65.99,
        color: 'Red',
        branchId: 1,
      };

      const mockResponse = {
        data: { id: 6, ...mockNewCar, status: 'AVAILABLE' },
        response: new Response(null, { status: 201 })
      };
      
      (api.POST as vi.Mock).mockResolvedValue(mockResponse);

      const result = await queries.createCar(mockNewCar);
      
      expect(api.POST).toHaveBeenCalledWith('/api/cars', { body: mockNewCar });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('Customer Queries', () => {
    it('should search customers', async () => {
      const mockResponse = {
        data: {
          content: [
            { id: 1, firstName: 'John', lastName: 'Doe' }
          ],
          totalElements: 1
        },
        response: new Response(null, { status: 200 })
      };
      
      (api.GET as vi.Mock).mockResolvedValue(mockResponse);

      const result = await queries.searchCustomers({ page: 0, size: 10, search: 'John' });
      
      expect(api.GET).toHaveBeenCalledWith('/api/customers/searchany', { params: { query: { page: 0, size: 10, search: 'John' } } });
      expect(result).toEqual(mockResponse.data);
    });

    it('should list customers', async () => {
      const mockResponse = {
        data: {
          content: [
            { id: 1, firstName: 'John', lastName: 'Doe' },
            { id: 2, firstName: 'Jane', lastName: 'Smith' }
          ],
          totalElements: 2
        },
        response: new Response(null, { status: 200 })
      };
      
      (api.GET as vi.Mock).mockResolvedValue(mockResponse);

      const result = await queries.listCustomers({ page: 0, size: 10 });
      
      expect(api.GET).toHaveBeenCalledWith('/api/customers', { params: { query: { page: 0, size: 10 } } });
      expect(result).toEqual(mockResponse.data);
    });

    it('should get customer by ID', async () => {
      const mockResponse = {
        data: { id: 1, firstName: 'John', lastName: 'Doe' },
        response: new Response(null, { status: 200 })
      };
      
      (api.GET as vi.Mock).mockResolvedValue(mockResponse);

      const result = await queries.getCustomerById(1);
      
      expect(api.GET).toHaveBeenCalledWith('/api/customers/{id}', { params: { path: { id: 1 } } });
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle customer not found', async () => {
      const mockError = {
        error: { message: 'Customer not found', status: 404 },
        response: new Response(null, { status: 404 })
      };
      
      (api.GET as vi.Mock).mockResolvedValue(mockError);

      await expect(queries.getCustomerById(999)).rejects.toThrow();
      expect(api.GET).toHaveBeenCalledWith('/api/customers/{id}', { params: { path: { id: 999 } } });
    });

    it('should create a new customer', async () => {
      const mockNewCustomer = {
        firstName: 'Alice',
        lastName: 'Johnson',
        email: 'alice.johnson@email.com',
        phone: '+15551004',
        driverLicenseNo: 'DL789456123',
        dateOfBirth: '1992-07-15',
        address: '321 Oak Street',
        city: 'Manhattan',
        country: 'USA',
        licenseExpiryDate: '2028-07-15',
      };

      const mockResponse = {
        data: { 
          id: 4, 
          ...mockNewCustomer, 
          fullName: 'Alice Johnson',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        response: new Response(null, { status: 201 })
      };
      
      (api.POST as vi.Mock).mockResolvedValue(mockResponse);

      const result = await queries.createCustomer(mockNewCustomer);
      
      expect(api.POST).toHaveBeenCalledWith('/api/customers', { body: mockNewCustomer });
      expect(result).toEqual(mockResponse.data);
    });

    it('should update a customer', async () => {
      const updatedCustomerData = {
        firstName: 'Johnny',
        lastName: 'Doe',
        email: 'john.doe@email.com',
        phone: '+15551001',
        driverLicenseNo: 'DL123456789',
        dateOfBirth: '1985-06-15',
        address: '123 Elm Street',
        city: 'New York',
        country: 'USA',
        licenseExpiryDate: '2027-06-15',
      };

      const mockResponse = {
        data: { 
          id: 1, 
          ...updatedCustomerData, 
          fullName: 'Johnny Doe',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        response: new Response(null, { status: 200 })
      };
      
      (api.PUT as vi.Mock).mockResolvedValue(mockResponse);

      const result = await queries.updateCustomer(1, updatedCustomerData);
      
      expect(api.PUT).toHaveBeenCalledWith('/api/customers/{id}', { 
        params: { path: { id: 1 } }, 
        body: updatedCustomerData 
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('Reservation Queries', () => {
    it('should list reservations', async () => {
      const mockResponse = {
        data: {
          content: [
            { id: 1, status: 'CONFIRMED' },
            { id: 2, status: 'PENDING' }
          ],
          totalElements: 2
        },
        response: new Response(null, { status: 200 })
      };
      
      (api.GET as vi.Mock).mockResolvedValue(mockResponse);

      const result = await queries.listReservations({ page: 0, size: 10 });
      
      expect(api.GET).toHaveBeenCalledWith('/api/reservations', { params: { query: { page: 0, size: 10 } } });
      expect(result).toEqual(mockResponse.data);
    });

    it('should get reservation by ID', async () => {
      const mockResponse = {
        data: { id: 1, status: 'CONFIRMED' },
        response: new Response(null, { status: 200 })
      };
      
      (api.GET as vi.Mock).mockResolvedValue(mockResponse);

      const result = await queries.getReservationById(1);
      
      expect(api.GET).toHaveBeenCalledWith('/api/reservations/{id}', { params: { path: { id: 1 } } });
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle reservation not found', async () => {
      const mockError = {
        error: { message: 'Reservation not found', status: 404 },
        response: new Response(null, { status: 404 })
      };
      
      (api.GET as vi.Mock).mockResolvedValue(mockError);

      await expect(queries.getReservationById(999)).rejects.toThrow();
      expect(api.GET).toHaveBeenCalledWith('/api/reservations/{id}', { params: { path: { id: 999 } } });
    });

    it('should create a new reservation', async () => {
      const mockNewReservation = {
        startDate: '2024-03-15',
        endDate: '2024-03-20',
        customerId: 1,
        carId: 1,
        pickupBranchId: 1,
        dropoffBranchId: 1,
        notes: 'Business trip',
      };

      const mockResponse = {
        data: { 
          id: 4, 
          ...mockNewReservation, 
          status: 'PENDING',
          totalPrice: 329.95,
          currency: 'USD'
        },
        response: new Response(null, { status: 201 })
      };
      
      (api.POST as vi.Mock).mockResolvedValue(mockResponse);

      const result = await queries.createReservation(mockNewReservation);
      
      expect(api.POST).toHaveBeenCalledWith('/api/reservations', { body: mockNewReservation });
      expect(result).toEqual(mockResponse.data);
    });

    it('should update a reservation', async () => {
      const updatedReservationData = {
        startDate: '2024-03-15',
        endDate: '2024-03-20',
        customerId: 1,
        carId: 1,
        pickupBranchId: 1,
        dropoffBranchId: 1,
        notes: 'Updated notes',
      };

      const mockResponse = {
        data: { 
          id: 1, 
          ...updatedReservationData, 
          status: 'PENDING',
          totalPrice: 329.95,
          currency: 'USD'
        },
        response: new Response(null, { status: 200 })
      };
      
      (api.PUT as vi.Mock).mockResolvedValue(mockResponse);

      const result = await queries.updateReservation(1, updatedReservationData);
      
      expect(api.PUT).toHaveBeenCalledWith('/api/reservations/{id}', { 
        params: { path: { id: 1 } }, 
        body: updatedReservationData 
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should confirm a reservation', async () => {
      const mockResponse = {
        data: { id: 1, status: 'CONFIRMED' },
        response: new Response(null, { status: 200 })
      };
      
      (api.POST as vi.Mock).mockResolvedValue(mockResponse);

      const result = await queries.confirmReservation(1);
      
      expect(api.POST).toHaveBeenCalledWith('/api/reservations/{id}/confirm', { params: { path: { id: 1 } } });
      expect(result).toEqual(mockResponse.data);
    });

    it('should cancel a reservation', async () => {
      const mockResponse = {
        data: { id: 1, status: 'CANCELLED' },
        response: new Response(null, { status: 200 })
      };
      
      (api.POST as vi.Mock).mockResolvedValue(mockResponse);

      const result = await queries.cancelReservation(1);
      
      expect(api.POST).toHaveBeenCalledWith('/api/reservations/{id}/cancel', { params: { path: { id: 1 } } });
      expect(result).toEqual(mockResponse.data);
    });

    it('should complete a reservation', async () => {
      const mockResponse = {
        data: { id: 1, status: 'COMPLETED' },
        response: new Response(null, { status: 200 })
      };
      
      (api.POST as vi.Mock).mockResolvedValue(mockResponse);

      const result = await queries.completeReservation(1);
      
      expect(api.POST).toHaveBeenCalledWith('/api/reservations/{id}/complete', { params: { path: { id: 1 } } });
      expect(result).toEqual(mockResponse.data);
    });
  });
});