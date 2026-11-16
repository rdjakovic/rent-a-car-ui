import { useCallback } from "react";
import { create, type StoreApi, type UseBoundStore } from "zustand";
import { todayString } from "@/lib/dates";

/**
 * Filters a list page keeps while you move between pages (in memory: a reload starts fresh).
 * Each page owns one store; its fields are plain values, usually the same text a filter input holds.
 */
const resets: Array<() => void> = [];

export function createFilterStore<T extends object>(initial: T | (() => T)) {
  // A function is evaluated on every reset, for defaults that change (like "today")
  const initialState = () => (typeof initial === "function" ? (initial as () => T)() : { ...initial });
  const useStore = create<T>(() => initialState());
  const reset = () => useStore.setState(initialState(), true);
  resets.push(reset);
  return Object.assign(useStore, { reset });
}

/** Back to the initial filters in every store (tests, and a "start over" if one is ever needed). */
export function resetFilterStores() {
  resets.forEach((reset) => reset());
}

/** One field of a filter store as [value, setter], like useState (the setter also takes an updater function). */
export function useFilterField<T extends object, K extends keyof T>(useStore: UseBoundStore<StoreApi<T>>, key: K) {
  const value = useStore((state) => state[key]);
  const setValue = useCallback(
    (next: T[K] | ((previous: T[K]) => T[K])) => {
      const resolved = typeof next === "function" ? (next as (previous: T[K]) => T[K])(useStore.getState()[key]) : next;
      useStore.setState({ [key]: resolved } as unknown as Partial<T>);
    },
    [useStore, key],
  );
  return [value, setValue] as const;
}

// --- The saved filters of each page ---

// The start date is pre-selected as today; the default branch is filled in by the page (it comes from the settings)
export const useAvailabilityFilters = createFilterStore(() => ({
  branchId: "",
  startDate: todayString(),
  endDate: "",
  category: "",
  transmission: "",
  fuelType: "",
  minSeats: "",
  maxPrice: "",
  page: 0,
  submitted: false,
}));

export const useCarsFilters = createFilterStore({
  search: "",
  year: "",
  vin: "",
  category: "",
  transmission: "",
  fuelType: "",
  minSeats: "",
  maxPrice: "",
  page: 0,
});

export const useCustomersFilters = createFilterStore({
  search: "",
  page: 0,
});

export const useReservationsFilters = createFilterStore({
  search: "",
  reservationId: "",
  status: "",
  startDate: "",
  endDate: "",
  page: 0,
});
