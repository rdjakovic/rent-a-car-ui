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

/** Charged days like the backend: a same-day rental is 1 day, otherwise the days between the dates. */
const calculateDaysBetween = (startDate: string, endDate: string): number => {
  // yyyy-mm-dd read as UTC dates, so daylight-saving changes can't make a day 23 or 25 hours long
  const days = Math.round((Date.parse(endDate) - Date.parse(startDate)) / 86_400_000);
  return Number.isFinite(days) ? Math.max(1, days) : 1;
};

/** Daily price times days, rounded to cents (45.99 x 3 would otherwise give 137.97000000000003). */
const calculateTotalCost = (dailyPrice: number, days: number): number =>
  Math.round(dailyPrice * days * 100) / 100;

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
    const totalCost = calculateTotalCost(bookingDetails.dailyPrice, totalDays);
    
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
      const totalCost = calculateTotalCost(bookingDetails.dailyPrice, totalDays);
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