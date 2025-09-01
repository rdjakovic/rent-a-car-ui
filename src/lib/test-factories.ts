import { vi } from 'vitest';

// Type definitions for test data
export interface TestBookingParams {
  carId: number;
  branchId: number;
  startDate: string;
  endDate: string;
  dailyPrice: number;
  carDisplayName?: string;
  carCategory?: string;
  branchName?: string;
}

export interface TestCarDetails {
  id: number;
  displayName: string;
  category: string;
  dailyPrice: number;
  branchName: string;
}

export interface TestCustomer {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  driverLicenseNo: string;
  city: string;
  country: string;
}

export interface TestReservation {
  id: number;
  carId: number;
  customerId: number;
  branchId: number;
  startDate: string;
  endDate: string;
  totalCost: number;
  status: string;
}

// Date utilities for consistent test dates
export class TestDateFactory {
  static getTomorrowDate(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }

  static getFutureDateByDays(days: number): string {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    return futureDate.toISOString().split('T')[0];
  }

  static getPastDateByDays(days: number): string {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - days);
    return pastDate.toISOString().split('T')[0];
  }

  static getDateRange(startDaysFromNow: number, endDaysFromNow: number): {
    startDate: string;
    endDate: string;
    duration: number;
  } {
    const startDate = this.getFutureDateByDays(startDaysFromNow);
    const endDate = this.getFutureDateByDays(endDaysFromNow);
    const duration = endDaysFromNow - startDaysFromNow;

    return { startDate, endDate, duration };
  }
}

// Booking parameters factory
export class BookingParamsFactory {
  static createValid(overrides: Partial<TestBookingParams> = {}): TestBookingParams {
    const { startDate, endDate } = TestDateFactory.getDateRange(1, 5);

    return {
      carId: 1,
      branchId: 2,
      startDate,
      endDate,
      dailyPrice: 50.00,
      carDisplayName: 'Toyota Camry',
      carCategory: 'MIDSIZE',
      branchName: 'Downtown Branch',
      ...overrides,
    };
  }

  static createMissingCarId(overrides: Partial<TestBookingParams> = {}): Partial<TestBookingParams> {
    const valid = this.createValid(overrides);
    const { carId, ...missing } = valid;
    return missing;
  }

  static createMissingBranchId(overrides: Partial<TestBookingParams> = {}): Partial<TestBookingParams> {
    const valid = this.createValid(overrides);
    const { branchId, ...missing } = valid;
    return missing;
  }

  static createMissingDates(overrides: Partial<TestBookingParams> = {}): Partial<TestBookingParams> {
    const valid = this.createValid(overrides);
    const { startDate, endDate, ...missing } = valid;
    return missing;
  }

  static createWithPastDate(overrides: Partial<TestBookingParams> = {}): TestBookingParams {
    const pastDate = TestDateFactory.getPastDateByDays(1);
    const futureDate = TestDateFactory.getFutureDateByDays(3);

    return this.createValid({
      startDate: pastDate,
      endDate: futureDate,
      ...overrides,
    });
  }

  static createWithInvalidDateOrder(overrides: Partial<TestBookingParams> = {}): TestBookingParams {
    const { startDate, endDate } = TestDateFactory.getDateRange(5, 1); // End before start

    return this.createValid({
      startDate,
      endDate,
      ...overrides,
    });
  }

  static createUrlSearchParams(params: Partial<TestBookingParams>): URLSearchParams {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.set(key, String(value));
      }
    });

    return searchParams;
  }

  static createUrlString(params: Partial<TestBookingParams>): string {
    const searchParams = this.createUrlSearchParams(params);
    return `?${searchParams.toString()}`;
  }
}

// Car details factory
export class CarDetailsFactory {
  static createDefault(overrides: Partial<TestCarDetails> = {}): TestCarDetails {
    return {
      id: 1,
      displayName: 'Toyota Camry',
      category: 'MIDSIZE',
      dailyPrice: 50.00,
      branchName: 'Downtown Branch',
      ...overrides,
    };
  }

  static createLuxury(overrides: Partial<TestCarDetails> = {}): TestCarDetails {
    return this.createDefault({
      id: 2,
      displayName: 'BMW 5 Series',
      category: 'LUXURY',
      dailyPrice: 120.00,
      ...overrides,
    });
  }

  static createEconomy(overrides: Partial<TestCarDetails> = {}): TestCarDetails {
    return this.createDefault({
      id: 3,
      displayName: 'Honda Civic',
      category: 'ECONOMY',
      dailyPrice: 35.00,
      ...overrides,
    });
  }
}

// Customer factory
export class CustomerFactory {
  static createDefault(overrides: Partial<TestCustomer> = {}): TestCustomer {
    return {
      id: 1,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+1234567890',
      driverLicenseNo: 'DL123456789',
      city: 'New York',
      country: 'US',
      ...overrides,
    };
  }

  static createAlternate(overrides: Partial<TestCustomer> = {}): TestCustomer {
    return this.createDefault({
      id: 2,
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com',
      phone: '+1987654321',
      driverLicenseNo: 'DL987654321',
      city: 'Los Angeles',
      country: 'US',
      ...overrides,
    });
  }
}

// Reservation factory
export class ReservationFactory {
  static createDefault(overrides: Partial<TestReservation> = {}): TestReservation {
    const { startDate, endDate, duration } = TestDateFactory.getDateRange(1, 5);
    const dailyPrice = 50.00;

    return {
      id: 1,
      carId: 1,
      customerId: 1,
      branchId: 2,
      startDate,
      endDate,
      totalCost: dailyPrice * duration,
      status: 'CONFIRMED',
      ...overrides,
    };
  }

  static createPending(overrides: Partial<TestReservation> = {}): TestReservation {
    return this.createDefault({
      status: 'PENDING',
      ...overrides,
    });
  }

  static createCancelled(overrides: Partial<TestReservation> = {}): TestReservation {
    return this.createDefault({
      status: 'CANCELLED',
      ...overrides,
    });
  }
}

// Mock store factory for booking flow
export class BookingFlowMockFactory {
  static createInitialState() {
    return {
      currentStep: 'customer' as const,
      carDetails: null,
      bookingDetails: null,
      customer: null,
      totalDays: 0,
      totalCost: 0,
      reservation: null,
      isLoading: false,
      isSubmitting: false,
      submissionError: null,
      initializationError: null,
    };
  }

  static createWithValidBooking(
    carDetails?: Partial<TestCarDetails>,
    bookingParams?: Partial<TestBookingParams>
  ) {
    const car = CarDetailsFactory.createDefault(carDetails);
    const booking = BookingParamsFactory.createValid(bookingParams);
    const { startDate, endDate, duration } = TestDateFactory.getDateRange(1, 5);

    return {
      ...this.createInitialState(),
      carDetails: car,
      bookingDetails: {
        carId: car.id,
        branchId: booking.branchId,
        startDate: booking.startDate || startDate,
        endDate: booking.endDate || endDate,
        dailyPrice: car.dailyPrice,
      },
      totalDays: duration,
      totalCost: car.dailyPrice * duration,
    };
  }

  static createWithCustomer(customer?: Partial<TestCustomer>) {
    const state = this.createWithValidBooking();
    return {
      ...state,
      customer: CustomerFactory.createDefault(customer),
      currentStep: 'review' as const,
    };
  }

  static createWithReservation(reservation?: Partial<TestReservation>) {
    const state = this.createWithCustomer();
    return {
      ...state,
      reservation: ReservationFactory.createDefault(reservation),
      currentStep: 'confirmation' as const,
    };
  }

  static createSubmitting() {
    const state = this.createWithCustomer();
    return {
      ...state,
      isSubmitting: true,
    };
  }

  static createWithError(error: string) {
    const state = this.createWithCustomer();
    return {
      ...state,
      submissionError: error,
    };
  }
}

// Mock functions factory
export class MockFunctionsFactory {
  static createBookingFlowMethods() {
    return {
      initializeBooking: vi.fn(),
      setCustomer: vi.fn(),
      calculateCost: vi.fn(),
      nextStep: vi.fn(),
      previousStep: vi.fn(),
      setReservation: vi.fn(),
      setLoading: vi.fn(),
      setSubmitting: vi.fn(),
      setSubmissionError: vi.fn(),
      setInitializationError: vi.fn(),
      reset: vi.fn(),
      canProceedToReview: vi.fn(() => false),
      canSubmitBooking: vi.fn(() => false),
      isStepComplete: vi.fn(() => false),
      getStepNumber: vi.fn(() => 1),
      initializeFromUrlParams: vi.fn(() => true),
    };
  }

  static createRouterMocks() {
    return {
      navigate: vi.fn(),
      useSearchParams: vi.fn(),
      useLocation: vi.fn(),
      useParams: vi.fn(),
    };
  }

  static createQueryMocks() {
    return {
      createReservation: vi.fn(),
      listCustomers: vi.fn().mockResolvedValue({
        content: [],
        totalElements: 0,
        totalPages: 0,
        size: 10,
        number: 0,
      }),
      getCar: vi.fn(),
      getBranch: vi.fn(),
    };
  }
}

// Test scenario factory for common test cases
export class TestScenarioFactory {
  static validBookingScenario() {
    const bookingParams = BookingParamsFactory.createValid();
    const carDetails = CarDetailsFactory.createDefault();
    const customer = CustomerFactory.createDefault();

    return {
      name: 'Valid Booking Scenario',
      bookingParams,
      carDetails,
      customer,
      urlParams: BookingParamsFactory.createUrlString(bookingParams),
      expectedDuration: 4,
      expectedCost: 200.00,
    };
  }

  static missingParametersScenario() {
    const bookingParams = BookingParamsFactory.createMissingCarId();

    return {
      name: 'Missing Parameters Scenario',
      bookingParams,
      urlParams: BookingParamsFactory.createUrlString(bookingParams),
      expectedError: 'Missing required booking parameters',
    };
  }

  static pastDateScenario() {
    const bookingParams = BookingParamsFactory.createWithPastDate();

    return {
      name: 'Past Date Scenario',
      bookingParams,
      urlParams: BookingParamsFactory.createUrlString(bookingParams),
      expectedError: 'Start date cannot be in the past',
    };
  }

  static invalidDateOrderScenario() {
    const bookingParams = BookingParamsFactory.createWithInvalidDateOrder();

    return {
      name: 'Invalid Date Order Scenario',
      bookingParams,
      urlParams: BookingParamsFactory.createUrlString(bookingParams),
      expectedError: 'End date must be after start date',
    };
  }

  static loadingScenario() {
    return {
      name: 'Loading Scenario',
      expectedLoadingText: 'Loading booking details...',
      timeout: 2000,
    };
  }

  static submissionScenario() {
    const scenario = this.validBookingScenario();

    return {
      ...scenario,
      name: 'Booking Submission Scenario',
      expectedSubmissionSteps: [
        'customer',
        'review',
        'confirmation',
      ],
    };
  }
}