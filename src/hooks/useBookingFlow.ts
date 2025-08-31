import { useBookingFlowStore } from "@/stores/useBookingFlowStore";
import type { CarListResponseDto } from "@/lib/api/queries";
import type { BookingDetails } from "@/stores/useBookingFlowStore";

export function useBookingFlow() {
  const store = useBookingFlowStore();

  const canProceedToReview = () => {
    return store.customer !== null && store.bookingDetails !== null && store.carDetails !== null;
  };

  const canSubmitBooking = () => {
    return canProceedToReview() && store.currentStep === 'review';
  };

  const isStepComplete = (step: 'customer' | 'review' | 'confirmation') => {
    switch (step) {
      case 'customer':
        return store.customer !== null;
      case 'review':
        return store.reservation !== null;
      case 'confirmation':
        return store.reservation !== null;
      default:
        return false;
    }
  };

  const getStepNumber = (step: 'customer' | 'review' | 'confirmation') => {
    switch (step) {
      case 'customer':
        return 1;
      case 'review':
        return 2;
      case 'confirmation':
        return 3;
      default:
        return 1;
    }
  };

  const initializeFromUrlParams = async (searchParams: URLSearchParams) => {
    try {
      const carId = searchParams.get('carId');
      const branchId = searchParams.get('branchId');
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');
      const dailyPrice = searchParams.get('dailyPrice');
      
      // Additional car details from URL params
      const carDisplayName = searchParams.get('carDisplayName');
      const carCategory = searchParams.get('carCategory');
      const branchName = searchParams.get('branchName');

      // Validate all required parameters are present
      if (!carId || !branchId || !startDate || !endDate || !dailyPrice) {
        console.error('Missing required URL parameters for booking initialization');
        return false;
      }

      const parsedCarId = parseInt(carId);
      const parsedBranchId = parseInt(branchId);
      const parsedDailyPrice = parseFloat(dailyPrice);

      // Validate parsed values
      if (isNaN(parsedCarId) || parsedCarId <= 0) {
        console.error('Invalid carId parameter:', carId);
        return false;
      }

      if (isNaN(parsedBranchId) || parsedBranchId <= 0) {
        console.error('Invalid branchId parameter:', branchId);
        return false;
      }

      if (isNaN(parsedDailyPrice) || parsedDailyPrice <= 0) {
        console.error('Invalid dailyPrice parameter:', dailyPrice);
        return false;
      }

      // Validate date format
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        console.error('Invalid date format:', { startDate, endDate });
        return false;
      }

      // Validate date logic
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (start < today) {
        console.error('Start date is in the past:', startDate);
        return false;
      }

      if (end <= start) {
        console.error('End date must be after start date:', { startDate, endDate });
        return false;
      }

      const bookingDetails: BookingDetails = {
        carId: parsedCarId,
        branchId: parsedBranchId,
        startDate,
        endDate,
        dailyPrice: parsedDailyPrice,
      };

      // Create minimal car details object with fallbacks
      const carDetails: CarListResponseDto = {
        id: parsedCarId,
        displayName: carDisplayName || 'Unknown Car',
        category: (carCategory as any) || 'ECONOMY',
        dailyPrice: parsedDailyPrice,
        branchName: branchName || 'Unknown Branch',
      };

      // Simulate async initialization (could be API calls in the future)
      await new Promise(resolve => setTimeout(resolve, 100));

      store.initializeBooking({ carDetails, bookingDetails });
      return true;
    } catch (error) {
      console.error('Error parsing URL parameters:', error);
      return false;
    }
  };

  return {
    // State
    currentStep: store.currentStep,
    carDetails: store.carDetails,
    bookingDetails: store.bookingDetails,
    customer: store.customer,
    totalDays: store.totalDays,
    totalCost: store.totalCost,
    reservation: store.reservation,
    isLoading: store.isLoading,
    isSubmitting: store.isSubmitting,
    submissionError: store.submissionError,

    // Actions
    initializeBooking: store.initializeBooking,
    setCustomer: store.setCustomer,
    calculateCost: store.calculateCost,
    nextStep: store.nextStep,
    previousStep: store.previousStep,
    setReservation: store.setReservation,
    setLoading: store.setLoading,
    setSubmitting: store.setSubmitting,
    setSubmissionError: store.setSubmissionError,
    reset: store.reset,

    // Computed values and helpers
    canProceedToReview,
    canSubmitBooking,
    isStepComplete,
    getStepNumber,
    initializeFromUrlParams,
  };
}