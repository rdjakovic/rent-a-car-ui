import { describe, it, expect, beforeEach } from 'vitest';
import { useBookingFlowStore } from '../useBookingFlowStore';
import type { CarListResponseDto, CustomerResponseDto, ReservationResponseDto } from '@/lib/api/queries';

// Mock data
const mockCarDetails: CarListResponseDto = {
  id: 1,
  displayName: 'Toyota Camry',
  category: 'INTERMEDIATE',
  dailyPrice: 50,
  branchName: 'Downtown Branch',
};

const mockCustomer: CustomerResponseDto = {
  id: 1,
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  phone: '+1234567890',
  driverLicenseNo: 'DL123456',
  city: 'New York',
  country: 'US',
};

const mockReservation: ReservationResponseDto = {
  id: 1,
  startDate: '2024-01-01',
  endDate: '2024-01-05',
  status: 'CONFIRMED',
  totalPrice: 200,
  currency: 'USD',
  customer: mockCustomer,
  car: mockCarDetails,
};

describe('useBookingFlowStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useBookingFlowStore.getState().reset();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = useBookingFlowStore.getState();
      
      expect(state.currentStep).toBe('customer');
      expect(state.carDetails).toBeNull();
      expect(state.bookingDetails).toBeNull();
      expect(state.customer).toBeNull();
      expect(state.totalDays).toBe(0);
      expect(state.totalCost).toBe(0);
      expect(state.reservation).toBeNull();
    });
  });

  describe('initializeBooking', () => {
    it('should initialize booking with car details and calculate costs', () => {
      const bookingDetails = {
        carId: 1,
        branchId: 1,
        startDate: '2024-01-01',
        endDate: '2024-01-05',
        dailyPrice: 50,
      };

      const { initializeBooking } = useBookingFlowStore.getState();
      initializeBooking({ carDetails: mockCarDetails, bookingDetails });

      const state = useBookingFlowStore.getState();
      expect(state.carDetails).toEqual(mockCarDetails);
      expect(state.bookingDetails).toEqual(bookingDetails);
      expect(state.totalDays).toBe(4); // 4 days between Jan 1 and Jan 5
      expect(state.totalCost).toBe(200); // 4 days * $50/day
      expect(state.currentStep).toBe('customer');
      expect(state.customer).toBeNull();
      expect(state.reservation).toBeNull();
    });

    it('should handle single day booking correctly', () => {
      const bookingDetails = {
        carId: 1,
        branchId: 1,
        startDate: '2024-01-01',
        endDate: '2024-01-01',
        dailyPrice: 50,
      };

      const { initializeBooking } = useBookingFlowStore.getState();
      initializeBooking({ carDetails: mockCarDetails, bookingDetails });

      const state = useBookingFlowStore.getState();
      expect(state.totalDays).toBe(1); // Same day booking should be 1 day
      expect(state.totalCost).toBe(50); // 1 day * $50/day
    });
  });

  describe('setCustomer', () => {
    it('should set the selected customer', () => {
      const { setCustomer } = useBookingFlowStore.getState();
      setCustomer(mockCustomer);

      const state = useBookingFlowStore.getState();
      expect(state.customer).toEqual(mockCustomer);
    });
  });

  describe('calculateCost', () => {
    it('should recalculate cost when booking details exist', () => {
      const bookingDetails = {
        carId: 1,
        branchId: 1,
        startDate: '2024-01-01',
        endDate: '2024-01-03',
        dailyPrice: 75,
      };

      const { initializeBooking, calculateCost } = useBookingFlowStore.getState();
      initializeBooking({ carDetails: mockCarDetails, bookingDetails });

      // Manually call calculateCost to test recalculation
      calculateCost();

      const state = useBookingFlowStore.getState();
      expect(state.totalDays).toBe(2); // 2 days between Jan 1 and Jan 3
      expect(state.totalCost).toBe(150); // 2 days * $75/day
    });

    it('should not crash when booking details are null', () => {
      const { calculateCost } = useBookingFlowStore.getState();
      
      expect(() => calculateCost()).not.toThrow();
      
      const state = useBookingFlowStore.getState();
      expect(state.totalDays).toBe(0);
      expect(state.totalCost).toBe(0);
    });
  });

  describe('step navigation', () => {
    it('should navigate from customer to review step', () => {
      const { nextStep } = useBookingFlowStore.getState();
      nextStep();

      const state = useBookingFlowStore.getState();
      expect(state.currentStep).toBe('review');
    });

    it('should navigate from review to confirmation step', () => {
      const { nextStep } = useBookingFlowStore.getState();
      
      // Go to review step first
      nextStep();
      expect(useBookingFlowStore.getState().currentStep).toBe('review');
      
      // Then to confirmation
      nextStep();
      expect(useBookingFlowStore.getState().currentStep).toBe('confirmation');
    });

    it('should not navigate beyond confirmation step', () => {
      const { nextStep } = useBookingFlowStore.getState();
      
      // Navigate to confirmation
      nextStep(); // customer -> review
      nextStep(); // review -> confirmation
      nextStep(); // should stay at confirmation
      
      const state = useBookingFlowStore.getState();
      expect(state.currentStep).toBe('confirmation');
    });

    it('should navigate backwards from review to customer', () => {
      const { nextStep, previousStep } = useBookingFlowStore.getState();
      
      // Go to review step
      nextStep();
      expect(useBookingFlowStore.getState().currentStep).toBe('review');
      
      // Go back to customer
      previousStep();
      expect(useBookingFlowStore.getState().currentStep).toBe('customer');
    });

    it('should navigate backwards from confirmation to review', () => {
      const { nextStep, previousStep } = useBookingFlowStore.getState();
      
      // Go to confirmation step
      nextStep(); // customer -> review
      nextStep(); // review -> confirmation
      expect(useBookingFlowStore.getState().currentStep).toBe('confirmation');
      
      // Go back to review
      previousStep();
      expect(useBookingFlowStore.getState().currentStep).toBe('review');
    });

    it('should not navigate before customer step', () => {
      const { previousStep } = useBookingFlowStore.getState();
      
      // Try to go back from customer step
      previousStep();
      
      const state = useBookingFlowStore.getState();
      expect(state.currentStep).toBe('customer');
    });
  });

  describe('setReservation', () => {
    it('should set reservation and move to confirmation step', () => {
      const { setReservation } = useBookingFlowStore.getState();
      setReservation(mockReservation);

      const state = useBookingFlowStore.getState();
      expect(state.reservation).toEqual(mockReservation);
      expect(state.currentStep).toBe('confirmation');
    });
  });

  describe('reset', () => {
    it('should reset all state to initial values', () => {
      const { initializeBooking, setCustomer, setReservation, reset } = useBookingFlowStore.getState();
      
      // Set up some state
      const bookingDetails = {
        carId: 1,
        branchId: 1,
        startDate: '2024-01-01',
        endDate: '2024-01-05',
        dailyPrice: 50,
      };
      
      initializeBooking({ carDetails: mockCarDetails, bookingDetails });
      setCustomer(mockCustomer);
      setReservation(mockReservation);
      
      // Verify state is set
      let state = useBookingFlowStore.getState();
      expect(state.carDetails).not.toBeNull();
      expect(state.customer).not.toBeNull();
      expect(state.reservation).not.toBeNull();
      
      // Reset and verify
      reset();
      
      state = useBookingFlowStore.getState();
      expect(state.currentStep).toBe('customer');
      expect(state.carDetails).toBeNull();
      expect(state.bookingDetails).toBeNull();
      expect(state.customer).toBeNull();
      expect(state.totalDays).toBe(0);
      expect(state.totalCost).toBe(0);
      expect(state.reservation).toBeNull();
    });
  });

  describe('date calculations', () => {
    it('should handle different date ranges correctly', () => {
      const testCases = [
        { start: '2024-01-01', end: '2024-01-01', expectedDays: 1 }, // Same day = 1 day
        { start: '2024-01-01', end: '2024-01-02', expectedDays: 1 }, // Next day = 1 day
        { start: '2024-01-01', end: '2024-01-08', expectedDays: 7 }, // 7 days apart = 7 days
        { start: '2024-01-15', end: '2024-01-31', expectedDays: 16 }, // 16 days apart = 16 days
        { start: '2024-02-28', end: '2024-03-01', expectedDays: 2 }, // 2 days apart = 2 days
      ];

      testCases.forEach(({ start, end, expectedDays }) => {
        const bookingDetails = {
          carId: 1,
          branchId: 1,
          startDate: start,
          endDate: end,
          dailyPrice: 50,
        };

        const { initializeBooking, reset } = useBookingFlowStore.getState();
        reset(); // Reset before each test case
        
        initializeBooking({ carDetails: mockCarDetails, bookingDetails });
        
        const state = useBookingFlowStore.getState();
        expect(state.totalDays).toBe(expectedDays);
        expect(state.totalCost).toBe(expectedDays * 50);
      });
    });
  });
});