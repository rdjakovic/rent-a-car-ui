import { create } from "zustand";

export type CarsFilters = {
  vin?: string;
  make?: string;
  model?: string;
  year?: string; // keep as string for input binding; convert when querying
  category?: string;
  transmission?: string;
  fuelType?: string;
  minSeats?: number;
  maxPrice?: number;
};

export type CarsState = {
  filters: CarsFilters;
  page: number;
  set: (p: Partial<CarsState>) => void;
  reset: () => void;
};

const initialState: Omit<CarsState, 'set' | 'reset'> = {
  filters: {},
  page: 0,
};

export const useCarsStore = create<CarsState>((set) => ({
  ...initialState,
  set: (p) => set(p),
  reset: () => set(initialState),
}));

