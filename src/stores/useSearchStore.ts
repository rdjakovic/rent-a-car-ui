import { create } from "zustand";

type Filters = {
  category?: string;
  transmission?: string;
  fuelType?: string;
  minSeats?: number;
  maxPrice?: number;
};

export type SearchState = {
  branchId?: number;
  startDate?: string; // ISO yyyy-mm-dd
  endDate?: string;   // ISO yyyy-mm-dd
  filters: Filters;
  page: number;
  submitted: boolean;
  set: (p: Partial<SearchState>) => void;
  reset: () => void;
};

const initialState: Omit<SearchState, 'set' | 'reset'> = {
  branchId: undefined,
  startDate: "",
  endDate: "",
  filters: {},
  page: 0,
  submitted: false,
};

export const useSearchStore = create<SearchState>((set) => ({
  ...initialState,
  set: (p) => set(p),
  reset: () => set(initialState),
}));
