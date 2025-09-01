import { create } from "zustand";

export type CustomersState = {
  search: string;
  page: number;
  set: (p: Partial<CustomersState>) => void;
  reset: () => void;
};

const initialState: Omit<CustomersState, 'set' | 'reset'> = {
  search: "",
  page: 0,
};

export const useCustomersStore = create<CustomersState>((set) => ({
  ...initialState,
  set: (p) => set(p),
  reset: () => set(initialState),
}));
