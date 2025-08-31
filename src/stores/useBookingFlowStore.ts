import { create } from "zustand";
import type { CustomerResponseDto, CarListResponseDto, ReservationResponseDto } from "@/lib/api/queries";

export type BookingStep = 'customer' | 'review' | 'confirmation';

export interface BookingDetails {
  carId: number;
  branchId: number;
  startDate: string; // ISO date string
  endDate: string;   // ISO date string
  dailyPrice: number;
}

export interface BookingFlowState {
  // Current step in the wizard
  currentStep: BookingStep;
  
  // Pre-filled from availability search
  carDetails: CarListResponseDto | null;
  
  // Booking parameters
  bookingDetails: BookingDetails | null;
  
  // Selected customer
  customer: CustomerResponseDto | null;
  
  // Calculated values
  totalDays: number;
  totalCost: number;
  
  // Result after successful booking
  reservation: ReservationResponseDto | null;
  
  // Loading and error states
  isLoading: boolean;
  isSubmitting: boolean;
  submissionError: string | null;
  
  // Actions
  initializeBooking: (params: {
    carDetails: CarListResponseDto;
    bookingDetails: BookingDetails;
  }) => void;
  setCustomer: (customer: CustomerResponseDto) => void;
  calculateCost: () => void;
  calculateDuration: (startDate: string, endDate: string) => number;
  calculateTotalCost: (dailyPrice: number, duration: number) => number;
  nextStep: () => void;
  previousStep: () => void;
  setReservation: (reservation: ReservationResponseDto) => void;
  setLoading: (isLoading: boolean) => void;
  setSubmitting: (isSubmitting: boolean) => void;
  setSubmissionError: (error: string | null) => void;
  reset: () => void;
}

const calculateDaysBetween = (startDate: string, endDate: string): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Reset time to avoid timezone issues
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  // For rental calculations, we want the actual number of days between dates
  // e.g., Jan 1 to Jan 5 = 4 days (Jan 1, 2, 3, 4)
  // Same-day rentals should be 1 day minimum
  return Math.max(1, diffDays);
};

export const useBookingFlowStore = create<BookingFlowState>((set, get) => ({
  currentStep: 'customer',
  carDetails: null,
  bookingDetails: null,
  customer: null,
  totalDays: 0,
  totalCost: 0,
  reservation: null,
  isLoading: false,
  isSubmitting: false,
  submissionError: null,

  initializeBooking: (params) => {
    const { carDetails, bookingDetails } = params;
    const store = get();
    const totalDays = store.calculateDuration(bookingDetails.startDate, bookingDetails.endDate);
    const totalCost = store.calculateTotalCost(bookingDetails.dailyPrice, totalDays);
    
    set({
      carDetails,
      bookingDetails,
      totalDays,
      totalCost,
      currentStep: 'customer',
      customer: null,
      reservation: null,
    });
  },

  setCustomer: (customer) => {
    set({ customer });
  },

  calculateCost: () => {
    const { bookingDetails } = get();
    if (bookingDetails) {
      const totalDays = calculateDaysBetween(bookingDetails.startDate, bookingDetails.endDate);
      // Ensure proper cost calculation with validation
      const dailyPrice = Math.max(0, bookingDetails.dailyPrice);
      const totalCost = Math.round((totalDays * dailyPrice) * 100) / 100; // Round to 2 decimal places
      set({ totalDays, totalCost });
    }
  },

  calculateDuration: (startDate: string, endDate: string) => {
    // Validate input parameters
    if (!startDate || !endDate) {
      console.error('Invalid date parameters for duration calculation');
      return 1;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Validate date objects
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      console.error('Invalid date format for duration calculation');
      return 1;
    }

    return calculateDaysBetween(startDate, endDate);
  },

  calculateTotalCost: (dailyPrice: number, duration: number) => {
    // Validate input parameters
    if (typeof dailyPrice !== 'number' || dailyPrice < 0) {
      console.error('Invalid daily price for cost calculation:', dailyPrice);
      return 0;
    }

    if (typeof duration !== 'number' || duration < 1) {
      console.error('Invalid duration for cost calculation:', duration);
      return 0;
    }

    // Calculate and round to 2 decimal places
    return Math.round((dailyPrice * duration) * 100) / 100;
  },

  nextStep: () => {
    const { currentStep } = get();
    if (currentStep === 'customer') {
      set({ currentStep: 'review' });
    } else if (currentStep === 'review') {
      set({ currentStep: 'confirmation' });
    }
  },

  previousStep: () => {
    const { currentStep } = get();
    if (currentStep === 'review') {
      set({ currentStep: 'customer' });
    } else if (currentStep === 'confirmation') {
      set({ currentStep: 'review' });
    }
  },

  setReservation: (reservation) => {
    set({ 
      reservation, 
      currentStep: 'confirmation',
      isSubmitting: false,
      submissionError: null
    });
  },

  setLoading: (isLoading) => {
    set({ isLoading });
  },

  setSubmitting: (isSubmitting) => {
    set({ isSubmitting });
  },

  setSubmissionError: (error) => {
    set({ submissionError: error, isSubmitting: false });
  },

  reset: () => {
    set({
      currentStep: 'customer',
      carDetails: null,
      bookingDetails: null,
      customer: null,
      totalDays: 0,
      totalCost: 0,
      reservation: null,
      isLoading: false,
      isSubmitting: false,
      submissionError: null,
    });
  },
}));