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
  isSubmitting: boolean;
  submissionError: string | null;
  
  // Actions
  initializeBooking: (params: {
    carDetails: CarListResponseDto;
    bookingDetails: BookingDetails;
  }) => void;
  setCustomer: (customer: CustomerResponseDto | null) => void;
  calculateCost: () => void;
  nextStep: () => void;
  previousStep: () => void;
  setReservation: (reservation: ReservationResponseDto) => void;
  setSubmitting: (isSubmitting: boolean) => void;
  setSubmissionError: (error: string | null) => void;
  reset: () => void;
}

const calculateDaysBetween = (startDate: string, endDate: string): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  // Ensure minimum of 1 day for same-day bookings
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
  isSubmitting: false,
  submissionError: null,

  initializeBooking: (params) => {
    const { carDetails, bookingDetails } = params;
    const totalDays = calculateDaysBetween(bookingDetails.startDate, bookingDetails.endDate);
    const totalCost = totalDays * bookingDetails.dailyPrice;
    
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
      const totalCost = totalDays * bookingDetails.dailyPrice;
      set({ totalDays, totalCost });
    }
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
      isSubmitting: false,
      submissionError: null,
    });
  },
}));