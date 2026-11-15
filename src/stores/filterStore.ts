import { useCallback } from "react";
import { create, type StoreApi, type UseBoundStore } from "zustand";

/**
 * Filters a list page keeps while you move between pages (in memory: a reload starts fresh).
 * Each page owns one store; its fields are plain values, usually the same text a filter input holds.
 */
const resets: Array<() => void> = [];

export function createFilterStore<T extends object>(initial: T) {
  const useStore = create<T>(() => ({ ...initial }));
  const reset = () => useStore.setState({ ...initial }, true);
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

export const useAvailabilityFilters = createFilterStore({
  branchId: "",
  startDate: "",
  endDate: "",
  category: "",
  transmission: "",
  fuelType: "",
  minSeats: "",
  maxPrice: "",
  page: 0,
  submitted: false,
});

export const useCarsFilters = createFilterStore({
  search: "",
  make: "",
  model: "",
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
