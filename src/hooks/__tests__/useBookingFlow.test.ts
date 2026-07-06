import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBookingFlow } from '../useBookingFlow';
import { useBookingFlowStore } from '@/stores/useBookingFlowStore';
import type { CarListResponseDto, CustomerResponseDto } from '@/lib/api/queries';

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

describe('useBookingFlow', () => {
  beforeEach(() => {
    // Reset store state before each test
    useBookingFlowStore.getState().reset();
  });

  describe('hook state access', () => {
    it('should provide access to all store state', () => {
      const { result } = renderHook(() => useBookingFlow());
      
      expect(result.current.currentStep).toBe('customer');
      expect(result.current.carDetails).toBeNull();
      expect(result.current.bookingDetails).toBeNull();
      expect(result.current.customer).toBeNull();
      expect(result.current.totalDays).toBe(0);
      expect(result.current.totalCost).toBe(0);
      expect(result.current.reservation).toBeNull();
      expect(result.current.isSubmitting).toBe(false);
      expect(result.current.submissionError).toBeNull();
    });

    it('should provide access to all store actions', () => {
      const { result } = renderHook(() => useBookingFlow());
      
      expect(typeof result.current.initializeBooking).toBe('function');
      expect(typeof result.current.setCustomer).toBe('function');
      expect(typeof result.current.calculateCost).toBe('function');
      expect(typeof result.current.nextStep).toBe('function');
      expect(typeof result.current.previousStep).toBe('function');
      expect(typeof result.current.setReservation).toBe('function');
      expect(typeof result.current.setSubmitting).toBe('function');
      expect(typeof result.current.setSubmissionError).toBe('function');
      expect(typeof result.current.reset).toBe('function');
    });
  });

  describe('canProceedToReview', () => {
    it('should return false when customer is not selected', () => {
      const { result } = renderHook(() => useBookingFlow());
      
      act(() => {
        result.current.initializeBooking({
          carDetails: mockCarDetails,
          bookingDetails: {
            carId: 1,
            branchId: 1,
            startDate: '2024-01-01',
            endDate: '2024-01-05',
            dailyPrice: 50,
          },
        });
      });
      
      expect(result.current.canProceedToReview()).toBe(false);
    });

    it('should return false when booking details are missing', () => {
      const { result } = renderHook(() => useBookingFlow());
      
      act(() => {
        result.current.setCustomer(mockCustomer);
      });
      
      expect(result.current.canProceedToReview()).toBe(false);
    });

    it('should return false when car details are missing', () => {
      const { result } = renderHook(() => useBookingFlow());
      
      act(() => {
        result.current.setCustomer(mockCustomer);
      });
      
      expect(result.current.canProceedToReview()).toBe(false);
    });

    it('should return true when all required data is present', () => {
      const { result } = renderHook(() => useBookingFlow());
      
      act(() => {
        result.current.initializeBooking({
          carDetails: mockCarDetails,
          bookingDetails: {
            carId: 1,
            branchId: 1,
            startDate: '2024-01-01',
            endDate: '2024-01-05',
            dailyPrice: 50,
          },
        });
        result.current.setCustomer(mockCustomer);
      });
      
      expect(result.current.canProceedToReview()).toBe(true);
    });
  });

  describe('canSubmitBooking', () => {
    it('should return false when not on review step', () => {
      const { result } = renderHook(() => useBookingFlow());
      
      act(() => {
        result.current.initializeBooking({
          carDetails: mockCarDetails,
          bookingDetails: {
            carId: 1,
            branchId: 1,
            startDate: '2024-01-01',
            endDate: '2024-01-05',
            dailyPrice: 50,
          },
        });
        result.current.setCustomer(mockCustomer);
      });
      
      expect(result.current.canSubmitBooking()).toBe(false);
    });

    it('should return false when on review step but missing required data', () => {
      const { result } = renderHook(() => useBookingFlow());
      
      act(() => {
        result.current.nextStep(); // Go to review step
      });
      
      expect(result.current.canSubmitBooking()).toBe(false);
    });

    it('should return true when on review step with all required data', () => {
      const { result } = renderHook(() => useBookingFlow());
      
      act(() => {
        result.current.initializeBooking({
          carDetails: mockCarDetails,
          bookingDetails: {
            carId: 1,
            branchId: 1,
            startDate: '2024-01-01',
            endDate: '2024-01-05',
            dailyPrice: 50,
          },
        });
        result.current.setCustomer(mockCustomer);
        result.current.nextStep(); // Go to review step
      });
      
      expect(result.current.canSubmitBooking()).toBe(true);
    });
  });

  describe('isStepComplete', () => {
    it('should return false for customer step when no customer selected', () => {
      const { result } = renderHook(() => useBookingFlow());
      
      expect(result.current.isStepComplete('customer')).toBe(false);
    });

    it('should return true for customer step when customer is selected', () => {
      const { result } = renderHook(() => useBookingFlow());
      
      act(() => {
        result.current.setCustomer(mockCustomer);
      });
      
      expect(result.current.isStepComplete('customer')).toBe(true);
    });

    it('should return false for review step when no reservation exists', () => {
      const { result } = renderHook(() => useBookingFlow());
      
      expect(result.current.isStepComplete('review')).toBe(false);
    });

    it('should return true for review step when reservation exists', () => {
      const { result } = renderHook(() => useBookingFlow());
      
      const mockReservation = {
        id: 1,
        startDate: '2024-01-01',
        endDate: '2024-01-05',
        status: 'CONFIRMED' as const,
        totalPrice: 200,
        currency: 'USD',
        customer: mockCustomer,
        car: mockCarDetails,
      };
      
      act(() => {
        result.current.setReservation(mockReservation);
      });
      
      expect(result.current.isStepComplete('review')).toBe(true);
    });

    it('should return true for confirmation step when reservation exists', () => {
      const { result } = renderHook(() => useBookingFlow());
      
      const mockReservation = {
        id: 1,
        startDate: '2024-01-01',
        endDate: '2024-01-05',
        status: 'CONFIRMED' as const,
        totalPrice: 200,
        currency: 'USD',
        customer: mockCustomer,
        car: mockCarDetails,
      };
      
      act(() => {
        result.current.setReservation(mockReservation);
      });
      
      expect(result.current.isStepComplete('confirmation')).toBe(true);
    });
  });

  describe('getStepNumber', () => {
    it('should return correct step numbers', () => {
      const { result } = renderHook(() => useBookingFlow());
      
      expect(result.current.getStepNumber('customer')).toBe(1);
      expect(result.current.getStepNumber('review')).toBe(2);
      expect(result.current.getStepNumber('confirmation')).toBe(3);
    });
  });

  describe('initializeFromUrlParams', () => {
    it('should return false when required parameters are missing', () => {
      const { result } = renderHook(() => useBookingFlow());
      
      const searchParams = new URLSearchParams();
      
      act(() => {
        const initialized = result.current.initializeFromUrlParams(searchParams);
        expect(initialized).toBe(false);
      });
    });

    it('should return false when some required parameters are missing', () => {
      const { result } = renderHook(() => useBookingFlow());
      
      const searchParams = new URLSearchParams({
        carId: '1',
        branchId: '1',
        startDate: '2024-01-01',
        // Missing endDate and dailyPrice
      });
      
      act(() => {
        const initialized = result.current.initializeFromUrlParams(searchParams);
        expect(initialized).toBe(false);
      });
    });

    it('should return true and initialize booking when all required parameters are present', () => {
      const { result } = renderHook(() => useBookingFlow());
      
      const searchParams = new URLSearchParams({
        carId: '1',
        branchId: '2',
        startDate: '2024-01-01',
        endDate: '2024-01-05',
        dailyPrice: '75.50',
      });
      
      act(() => {
        const initialized = result.current.initializeFromUrlParams(searchParams);
        expect(initialized).toBe(true);
      });
      
      expect(result.current.carDetails).toEqual({
        id: 1,
        displayName: 'Unknown Car',
        category: 'ECONOMY',
        dailyPrice: 75.50,
        branchName: 'Unknown Branch',
      });
      
      expect(result.current.bookingDetails).toEqual({
        carId: 1,
        branchId: 2,
        startDate: '2024-01-01',
        endDate: '2024-01-05',
        dailyPrice: 75.50,
      });
      
      expect(result.current.totalDays).toBe(4);
      expect(result.current.totalCost).toBe(302); // 4 days * 75.50
    });

    it('should use optional parameters when provided', () => {
      const { result } = renderHook(() => useBookingFlow());
      
      const searchParams = new URLSearchParams({
        carId: '1',
        branchId: '2',
        startDate: '2024-01-01',
        endDate: '2024-01-05',
        dailyPrice: '75.50',
        carDisplayName: 'Honda Accord',
        carCategory: 'MIDSIZE',
        branchName: 'Airport Branch',
      });
      
      act(() => {
        const initialized = result.current.initializeFromUrlParams(searchParams);
        expect(initialized).toBe(true);
      });
      
      expect(result.current.carDetails).toEqual({
        id: 1,
        displayName: 'Honda Accord',
        category: 'MIDSIZE',
        dailyPrice: 75.50,
        branchName: 'Airport Branch',
      });
    });

    it('should reject invalid number parameters gracefully', () => {
      const { result } = renderHook(() => useBookingFlow());

      const searchParams = new URLSearchParams({
        carId: 'invalid',
        branchId: '2',
        startDate: '2024-01-01',
        endDate: '2024-01-05',
        dailyPrice: '75.50',
      });

      act(() => {
        // initializeFromUrlParams validates each numeric param and rejects
        // the whole call (rather than propagating NaN) when carId doesn't parse.
        const initialized = result.current.initializeFromUrlParams(searchParams);
        expect(initialized).toBe(false);
      });

      expect(result.current.carDetails).toBeNull();
      expect(result.current.bookingDetails).toBeNull();
    });
  });

  describe('submission state management', () => {
    it('should handle submission state changes', () => {
      const { result } = renderHook(() => useBookingFlow());
      
      act(() => {
        result.current.setSubmitting(true);
      });
      
      expect(result.current.isSubmitting).toBe(true);
      
      act(() => {
        result.current.setSubmitting(false);
      });
      
      expect(result.current.isSubmitting).toBe(false);
    });

    it('should handle submission error state', () => {
      const { result } = renderHook(() => useBookingFlow());
      
      const errorMessage = 'Failed to create reservation';
      
      act(() => {
        result.current.setSubmissionError(errorMessage);
      });
      
      expect(result.current.submissionError).toBe(errorMessage);
      expect(result.current.isSubmitting).toBe(false);
      
      act(() => {
        result.current.setSubmissionError(null);
      });
      
      expect(result.current.submissionError).toBeNull();
    });

    it('should clear submission state when setting reservation', () => {
      const { result } = renderHook(() => useBookingFlow());
      
      const mockReservation = {
        id: 1,
        startDate: '2024-01-01',
        endDate: '2024-01-05',
        status: 'CONFIRMED' as const,
        totalPrice: 200,
        currency: 'USD',
        customer: mockCustomer,
        car: mockCarDetails,
      };
      
      act(() => {
        result.current.setSubmitting(true);
      });
      
      // Check state after setting submission state
      expect(result.current.isSubmitting).toBe(true);
      
      act(() => {
        result.current.setSubmissionError('Some error');
      });
      
      // setSubmissionError sets isSubmitting to false
      expect(result.current.isSubmitting).toBe(false);
      expect(result.current.submissionError).toBe('Some error');
      
      act(() => {
        result.current.setReservation(mockReservation);
      });
      
      // Check state after setting reservation
      expect(result.current.reservation).toEqual(mockReservation);
      expect(result.current.currentStep).toBe('confirmation');
      expect(result.current.isSubmitting).toBe(false);
      expect(result.current.submissionError).toBeNull();
    });

    it('should reset submission state when resetting store', () => {
      const { result } = renderHook(() => useBookingFlow());
      
      act(() => {
        result.current.setSubmitting(true);
      });
      
      // Check state after setting submission state
      expect(result.current.isSubmitting).toBe(true);
      
      act(() => {
        result.current.setSubmissionError('Some error');
      });
      
      // setSubmissionError sets isSubmitting to false
      expect(result.current.isSubmitting).toBe(false);
      expect(result.current.submissionError).toBe('Some error');
      
      act(() => {
        result.current.reset();
      });
      
      // Check state after reset
      expect(result.current.isSubmitting).toBe(false);
      expect(result.current.submissionError).toBeNull();
    });
  });

  describe('integration with store', () => {
    it('should reflect store state changes', () => {
      const { result } = renderHook(() => useBookingFlow());
      
      act(() => {
        result.current.initializeBooking({
          carDetails: mockCarDetails,
          bookingDetails: {
            carId: 1,
            branchId: 1,
            startDate: '2024-01-01',
            endDate: '2024-01-05',
            dailyPrice: 50,
          },
        });
      });
      
      expect(result.current.carDetails).toEqual(mockCarDetails);
      expect(result.current.totalCost).toBe(200);
      
      act(() => {
        result.current.setCustomer(mockCustomer);
      });
      
      expect(result.current.customer).toEqual(mockCustomer);
      expect(result.current.canProceedToReview()).toBe(true);
      
      act(() => {
        result.current.nextStep();
      });
      
      expect(result.current.currentStep).toBe('review');
      expect(result.current.canSubmitBooking()).toBe(true);
    });
  });
});