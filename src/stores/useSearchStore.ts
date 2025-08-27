import { create } from "zustand";

type Filters = {
  category?: string;
  transmission?: string;
  fuelType?: string;
  minSeats?: number;
  maxPrice?: number;
};

type SearchState = {
  branchId?: number;
  startDate?: string; // ISO yyyy-mm-dd
  endDate?: string;   // ISO yyyy-mm-dd
  filters: Filters;
  set: (p: Partial<SearchState>) => void;
};

export const useSearchStore = create<SearchState>((set) => ({
  filters: {},
  set: (p) => set(p),
}));
