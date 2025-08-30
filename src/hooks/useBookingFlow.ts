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

  const initializeFromUrlParams = (searchParams: URLSearchParams) => {
    const carId = searchParams.get('carId');
    const branchId = searchParams.get('branchId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const dailyPrice = searchParams.get('dailyPrice');
    
    // Additional car details from URL params
    const carDisplayName = searchParams.get('carDisplayName');
    const carCategory = searchParams.get('carCategory');
    const branchName = searchParams.get('branchName');

    if (carId && branchId && startDate && endDate && dailyPrice) {
      const bookingDetails: BookingDetails = {
        carId: parseInt(carId),
        branchId: parseInt(branchId),
        startDate,
        endDate,
        dailyPrice: parseFloat(dailyPrice),
      };

      // Create minimal car details object
      const carDetails: CarListResponseDto = {
        id: parseInt(carId),
        displayName: carDisplayName || 'Unknown Car',
        category: (carCategory as any) || 'ECONOMY',
        dailyPrice: parseFloat(dailyPrice),
        branchName: branchName || 'Unknown Branch',
      };

      store.initializeBooking({ carDetails, bookingDetails });
      return true;
    }
    
    return false;
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

    // Actions
    initializeBooking: store.initializeBooking,
    setCustomer: store.setCustomer,
    calculateCost: store.calculateCost,
    nextStep: store.nextStep,
    previousStep: store.previousStep,
    setReservation: store.setReservation,
    reset: store.reset,

    // Computed values and helpers
    canProceedToReview,
    canSubmitBooking,
    isStepComplete,
    getStepNumber,
    initializeFromUrlParams,
  };
}