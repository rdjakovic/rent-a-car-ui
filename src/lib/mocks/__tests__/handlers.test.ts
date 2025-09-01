import { setupServer } from 'msw/node';
import { HttpResponse, http } from 'msw';
import { handlers } from '../handlers';
import {
  mockBranches,
  mockCars,
  mockCustomers,
  mockReservations,
  generateId,
  generatePaginatedResponse,
  delay,
} from '../data';

// Setup MSW server for testing
const server = setupServer(...handlers);

// Mock data utilities
const mockNewCar = {
  vin: 'JH4KA8260MC000006',
  make: 'Audi',
  model: 'A4',
  year: 2023,
  category: 'PREMIUM',
  transmission: 'AUTOMATIC',
  fuelType: 'GASOLINE',
  seats: 5,
  dailyPrice: 65.99,
  color: 'Red',
  branchId: 1,
};

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

const mockNewReservation = {
  startDate: '2024-03-15',
  endDate: '2024-03-20',
  customerId: 1,
  carId: 1,
  pickupBranchId: 1,
  dropoffBranchId: 1,
  notes: 'Business trip',
};

describe('Mock Handlers', () => {
  beforeAll(() => {
    server.listen();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  describe('Branch Endpoints', () => {
    it('should return paginated branches', async () => {
      const response = await fetch('http://localhost:3000/api/branches?page=0&size=2');
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.content).toHaveLength(2);
      expect(data.totalElements).toBe(mockBranches.length);
      expect(data.number).toBe(0);
      expect(data.size).toBe(2);
    });
  });

  describe('Car Endpoints', () => {
    it('should return paginated cars', async () => {
      const response = await fetch('http://localhost:3000/api/cars?page=0&size=3');
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.content).toHaveLength(3);
      expect(data.totalElements).toBe(mockCars.length);
    });

    it('should filter cars by VIN', async () => {
      const response = await fetch('http://localhost:3000/api/cars?vin=JH4KA8260MC000001');
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.content).toHaveLength(1);
      expect(data.content[0].vin).toBe('JH4KA8260MC000001');
    });

    it('should filter cars by make', async () => {
      const response = await fetch('http://localhost:3000/api/cars?make=Toyota');
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.content).toHaveLength(1);
      expect(data.content[0].make).toBe('Toyota');
    });

    it('should filter cars by model', async () => {
      const response = await fetch('http://localhost:3000/api/cars?model=Corolla');
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.content).toHaveLength(1);
      expect(data.content[0].model).toBe('Corolla');
    });

    it('should filter cars by year', async () => {
      const response = await fetch('http://localhost:3000/api/cars?year=2023');
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.content.every((car: any) => car.year === 2023)).toBe(true);
    });

    it('should filter cars by category', async () => {
      const response = await fetch('http://localhost:3000/api/cars?category=COMPACT');
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.content.every((car: any) => car.category === 'COMPACT')).toBe(true);
    });

    it('should filter cars by transmission', async () => {
      const response = await fetch('http://localhost:3000/api/cars?transmission=AUTOMATIC');
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.content.every((car: any) => car.transmission === 'AUTOMATIC')).toBe(true);
    });

    it('should filter cars by fuel type', async () => {
      const response = await fetch('http://localhost:3000/api/cars?fuelType=GASOLINE');
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.content.every((car: any) => car.fuelType === 'GASOLINE')).toBe(true);
    });

    it('should return available cars', async () => {
      const response = await fetch('http://localhost:3000/api/cars/available?page=0&size=10');
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.content.every((car: any) => car.status === 'AVAILABLE')).toBe(true);
    });

    it('should return car by ID', async () => {
      const response = await fetch('http://localhost:3000/api/cars/1');
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.id).toBe(1);
    });

    it('should return 404 for non-existent car', async () => {
      const response = await fetch('http://localhost:3000/api/cars/999');
      const data = await response.json();
      
      expect(response.status).toBe(404);
      expect(data.message).toBe('Car not found');
    });

    it('should create a new car', async () => {
      const response = await fetch('http://localhost:3000/api/cars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockNewCar)
      });
      const data = await response.json();
      
      expect(response.status).toBe(201);
      expect(data.vin).toBe(mockNewCar.vin);
      expect(data.make).toBe(mockNewCar.make);
      expect(data.model).toBe(mockNewCar.model);
      expect(data.status).toBe('AVAILABLE');
    });

    it('should return validation error when creating car with missing fields', async () => {
      const incompleteCar = { make: 'Audi', model: 'A4' }; // Missing VIN and year
      const response = await fetch('http://localhost:3000/api/cars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(incompleteCar)
      });
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.message).toBe('Validation failed');
    });
  });

  describe('Customer Endpoints', () => {
    it('should return paginated customers', async () => {
      const response = await fetch('http://localhost:3000/api/customers?page=0&size=2');
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.content).toHaveLength(2);
      expect(data.totalElements).toBe(mockCustomers.length);
    });

    it('should search customers by name (finds multiple matches)', async () => {
      // Searching for "John" should match both John Doe (firstName) and Michael Johnson (lastName)
      const response = await fetch('http://localhost:3000/api/customers?search=John');
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.content).toHaveLength(2);
      expect(data.content.some((c: any) => c.firstName === 'John')).toBe(true);
      expect(data.content.some((c: any) => c.lastName === 'Johnson')).toBe(true);
    });

    it('should search customers with enhanced search endpoint', async () => {
      const response = await fetch('http://localhost:3000/api/customers/searchany?search=Jane');
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.content).toHaveLength(1);
      expect(data.content[0].firstName).toBe('Jane');
    });

    it('should search customers by email', async () => {
      const response = await fetch('http://localhost:3000/api/customers/searchany?search=john.doe@email.com');
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.content).toHaveLength(1);
      expect(data.content[0].email).toBe('john.doe@email.com');
    });

    it('should search customers by phone', async () => {
      const response = await fetch('http://localhost:3000/api/customers/searchany?search=%2B1-555-1001');
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.content).toHaveLength(1);
      expect(data.content[0].phone).toBe('+1-555-1001');
    });

    it('should search customers by city', async () => {
      const response = await fetch('http://localhost:3000/api/customers/searchany?search=Brooklyn');
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.content).toHaveLength(1);
      expect(data.content[0].city).toBe('Brooklyn');
    });

    it('should search customers by driver license number', async () => {
      const response = await fetch('http://localhost:3000/api/customers/searchany?search=DL123456789');
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.content).toHaveLength(1);
      expect(data.content[0].driverLicenseNo).toBe('DL123456789');
    });

    it('should return customer by ID', async () => {
      const response = await fetch('http://localhost:3000/api/customers/1');
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.id).toBe(1);
    });

    it('should return 404 for non-existent customer', async () => {
      const response = await fetch('http://localhost:3000/api/customers/999');
      const data = await response.json();
      
      expect(response.status).toBe(404);
      expect(data.message).toBe('Customer not found');
    });

    it('should create a new customer', async () => {
      const response = await fetch('http://localhost:3000/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockNewCustomer)
      });
      const data = await response.json();
      
      expect(response.status).toBe(201);
      expect(data.firstName).toBe(mockNewCustomer.firstName);
      expect(data.lastName).toBe(mockNewCustomer.lastName);
      expect(data.email).toBe(mockNewCustomer.email);
      expect(data.fullName).toBe(`${mockNewCustomer.firstName} ${mockNewCustomer.lastName}`);
    });

    it('should return validation error when creating customer with missing fields', async () => {
      const incompleteCustomer = { firstName: 'Alice' }; // Missing lastName and email
      const response = await fetch('http://localhost:3000/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(incompleteCustomer)
      });
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.message).toBe('Validation failed');
    });

    it('should update an existing customer', async () => {
      const updatedCustomer = {
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

      const response = await fetch('http://localhost:3000/api/customers/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedCustomer)
      });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.firstName).toBe('Johnny');
      expect(data.fullName).toBe('Johnny Doe');
    });

    it('should return 404 when updating non-existent customer', async () => {
      const updatedCustomer = {
        firstName: 'Non',
        lastName: 'Existent',
        email: 'non.existent@email.com',
      };

      const response = await fetch('http://localhost:3000/api/customers/999', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedCustomer)
      });
      const data = await response.json();
      
      expect(response.status).toBe(404);
      expect(data.message).toBe('Customer not found');
    });
  });

  describe('Reservation Endpoints', () => {
    it('should return paginated reservations', async () => {
      const response = await fetch('http://localhost:3000/api/reservations?page=0&size=2');
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.content).toHaveLength(2);
      expect(data.totalElements).toBe(mockReservations.length);
    });

    it('should filter reservations by customer ID', async () => {
      const response = await fetch('http://localhost:3000/api/reservations?customerId=1');
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.content.every((r: any) => r.customer.id === 1)).toBe(true);
    });

    it('should filter reservations by status', async () => {
      const response = await fetch('http://localhost:3000/api/reservations?status=CONFIRMED');
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.content.every((r: any) => r.status === 'CONFIRMED')).toBe(true);
    });

    it('should return reservation by ID', async () => {
      const response = await fetch('http://localhost:3000/api/reservations/1');
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.id).toBe(1);
    });

    it('should return 404 for non-existent reservation', async () => {
      const response = await fetch('http://localhost:3000/api/reservations/999');
      const data = await response.json();
      
      expect(response.status).toBe(404);
      expect(data.message).toBe('Reservation not found');
    });

    it('should create a new reservation', async () => {
      const response = await fetch('http://localhost:3000/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockNewReservation)
      });
      const data = await response.json();
      
      expect(response.status).toBe(201);
      expect(data.customerId).toBe(mockNewReservation.customerId);
      expect(data.carId).toBe(mockNewReservation.carId);
      expect(data.pickupBranchId).toBe(mockNewReservation.pickupBranchId);
      expect(data.dropoffBranchId).toBe(mockNewReservation.dropoffBranchId);
      expect(data.status).toBe('PENDING');
      expect(data.durationDays).toBe(5); // 2024-03-15 to 2024-03-20
    });

    it('should return error when creating reservation with invalid IDs', async () => {
      const invalidReservation = {
        ...mockNewReservation,
        customerId: 999, // Non-existent customer
      };

      const response = await fetch('http://localhost:3000/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidReservation)
      });
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.message).toBe('Invalid customer, car, or branch ID');
    });

    it('should confirm a reservation', async () => {
      const response = await fetch('http://localhost:3000/api/reservations/1/confirm', {
        method: 'POST'
      });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.status).toBe('CONFIRMED');
    });

    it('should return 404 when confirming non-existent reservation', async () => {
      const response = await fetch('http://localhost:3000/api/reservations/999/confirm', {
        method: 'POST'
      });
      const data = await response.json();
      
      expect(response.status).toBe(404);
      expect(data.message).toBe('Reservation not found');
    });

    it('should cancel a reservation', async () => {
      const response = await fetch('http://localhost:3000/api/reservations/1/cancel', {
        method: 'POST'
      });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.status).toBe('CANCELLED');
    });

    it('should return 404 when cancelling non-existent reservation', async () => {
      const response = await fetch('http://localhost:3000/api/reservations/999/cancel', {
        method: 'POST'
      });
      const data = await response.json();
      
      expect(response.status).toBe(404);
      expect(data.message).toBe('Reservation not found');
    });

    it('should complete a reservation', async () => {
      const response = await fetch('http://localhost:3000/api/reservations/1/complete', {
        method: 'POST'
      });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.status).toBe('COMPLETED');
    });

    it('should return 404 when completing non-existent reservation', async () => {
      const response = await fetch('http://localhost:3000/api/reservations/999/complete', {
        method: 'POST'
      });
      const data = await response.json();
      
      expect(response.status).toBe(404);
      expect(data.message).toBe('Reservation not found');
    });
  });

  describe('Utility Functions', () => {
    it('should generate a random ID', () => {
      const id1 = generateId();
      const id2 = generateId();
      
      expect(typeof id1).toBe('number');
      expect(id1).toBeGreaterThanOrEqual(1000);
      expect(id1).toBeLessThanOrEqual(10000);
      // It's possible but unlikely that two consecutive IDs are the same
      // We won't assert they're different to avoid flaky tests
    });

    it('should generate paginated response', () => {
      const items = [1, 2, 3, 4, 5];
      const page = 0;
      const size = 2;
      
      const result = generatePaginatedResponse(items, page, size);
      
      expect(result.content).toEqual([1, 2]);
      expect(result.number).toBe(0);
      expect(result.size).toBe(2);
      expect(result.totalElements).toBe(5);
      expect(result.totalPages).toBe(3);
      expect(result.first).toBe(true);
      expect(result.last).toBe(false);
      expect(result.empty).toBe(false);
      expect(result.numberOfElements).toBe(2);
    });

    it('should handle empty page in paginated response', () => {
      const items: any[] = [];
      const page = 0;
      const size = 2;
      
      const result = generatePaginatedResponse(items, page, size);
      
      expect(result.content).toEqual([]);
      expect(result.number).toBe(0);
      expect(result.size).toBe(2);
      expect(result.totalElements).toBe(0);
      expect(result.totalPages).toBe(0);
      expect(result.first).toBe(true);
      expect(result.last).toBe(true);
      expect(result.empty).toBe(true);
      expect(result.numberOfElements).toBe(0);
    });

    it('should handle last page in paginated response', () => {
      const items = [1, 2, 3, 4, 5];
      const page = 2;
      const size = 2;
      
      const result = generatePaginatedResponse(items, page, size);
      
      expect(result.content).toEqual([5]);
      expect(result.number).toBe(2);
      expect(result.size).toBe(2);
      expect(result.totalElements).toBe(5);
      expect(result.totalPages).toBe(3);
      expect(result.first).toBe(false);
      expect(result.last).toBe(true);
      expect(result.empty).toBe(false);
      expect(result.numberOfElements).toBe(1);
    });

    it('should return a promise that resolves after delay', async () => {
      const start = Date.now();
      await delay(10); // 10ms delay
      const end = Date.now();
      
      expect(end - start).toBeGreaterThanOrEqual(10);
    });
  });
});