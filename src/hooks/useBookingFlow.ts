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
      // Clear any previous initialization errors
      store.setInitializationError(null);
      
      // Simulate async initialization delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Use the store's validation method for consistent parameter validation
      const validation = store.validateUrlParameters(searchParams);
      
      if (!validation.isValid) {
        console.error('URL parameter validation failed:', validation.error);
        store.setInitializationError(validation.error || 'Invalid booking parameters. Please start from the availability search.');
        return false;
      }

      // Extract parameters (we know they're valid at this point)
      const carId = searchParams.get('carId')!;
      const branchId = searchParams.get('branchId')!;
      const startDate = searchParams.get('startDate')!;
      const endDate = searchParams.get('endDate')!;
      const dailyPrice = searchParams.get('dailyPrice')!;
      
      // Additional car details from URL params
      const carDisplayName = searchParams.get('carDisplayName');
      const carCategory = searchParams.get('carCategory');
      const branchName = searchParams.get('branchName');

      const parsedCarId = parseInt(carId);
      const parsedBranchId = parseInt(branchId);
      const parsedDailyPrice = parseFloat(dailyPrice);

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

      // Additional delay for successful initialization
      await new Promise(resolve => setTimeout(resolve, 100));

      // Initialize the booking with validated parameters
      store.initializeBooking({ carDetails, bookingDetails });
      store.setInitializationError(null);
      return true;
    } catch (error) {
      console.error('Error during booking initialization:', error);
      store.setInitializationError('Failed to load booking details. Please try again.');
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
    initializationError: store.initializationError,

    // Actions
    initializeBooking: store.initializeBooking,
    setCustomer: store.setCustomer,
    calculateCost: store.calculateCost,
    validateUrlParameters: store.validateUrlParameters,
    nextStep: store.nextStep,
    previousStep: store.previousStep,
    setReservation: store.setReservation,
    setLoading: store.setLoading,
    setSubmitting: store.setSubmitting,
    setSubmissionError: store.setSubmissionError,
    setInitializationError: store.setInitializationError,
    reset: store.reset,

    // Computed values and helpers
    canProceedToReview,
    canSubmitBooking,
    isStepComplete,
    getStepNumber,
    initializeFromUrlParams,
  };
}