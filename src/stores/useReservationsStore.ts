import { create } from "zustand";

export type ReservationsState = {
  search: string;
  reservationIdSearch: string;
  status: string;
  startDate: string;
  endDate: string;
  page: number;
  set: (p: Partial<ReservationsState>) => void;
  reset: () => void;
};

const initialState: Omit<ReservationsState, 'set' | 'reset'> = {
  search: "",
  reservationIdSearch: "",
  status: "ALL",
  startDate: "",
  endDate: "",
  page: 0,
};

export const useReservationsStore = create<ReservationsState>((set) => ({
  ...initialState,
  set: (p) => set(p),
  reset: () => set(initialState),
}));
