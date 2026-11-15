import { api } from "./client";
import type { components } from "./schema";
import { apiErrorFromResponse, normalizeError } from "./errors";

/**
 * Runs an openapi-fetch call and returns its data, or throws an ApiError: for any non-2xx response
 * (including a 403 without a body) and for network failures. The error's message is the backend's
 * reason where there is one, e.g. "Car is not available for the selected dates".
 */
async function request<T>(call: Promise<{ data?: unknown; error?: unknown; response: Response }>): Promise<T> {
  let res;
  try {
    res = await call;
  } catch (error) {
    throw normalizeError(error);
  }
  if (!res.response.ok) {
    throw apiErrorFromResponse(res.response.status, res.error);
  }
  return res.data as T;
}

export type PageBranchResponseDto = components["schemas"]["PageBranchResponseDto"];
export type BranchResponseDto = components["schemas"]["BranchResponseDto"];
export type PageCarListResponseDto = components["schemas"]["PageCarListResponseDto"];
export type CarListResponseDto = components["schemas"]["CarListResponseDto"];

export type BranchRequestDto = components["schemas"]["BranchRequestDto"];

export function listBranches(params?: { page?: number; size?: number; sort?: string[] }) {
  return request<PageBranchResponseDto>(api.GET("/api/v1/branches", { params: { query: params } }));
}

export type BranchSearchParams = {
  page?: number;
  size?: number;
  /** Partial, case-insensitive; blank is ignored */
  name?: string;
  city?: string;
  sort?: string[];
};

export function searchBranches(params: BranchSearchParams = {}) {
  return request<PageBranchResponseDto>(api.GET("/api/v1/branches/search", { params: { query: params } }));
}

/** ADMIN only with the real security rules. */
export function createBranch(branch: BranchRequestDto) {
  return request<BranchResponseDto>(api.POST("/api/v1/branches", { body: branch }));
}

/** ADMIN only with the real security rules. Leaving `active` out keeps the branch's status. */
export function updateBranch(id: number, branch: BranchRequestDto) {
  return request<BranchResponseDto>(api.PUT("/api/v1/branches/{id}", { params: { path: { id } }, body: branch }));
}

export type AvailabilityParams = {
  branchId: number;
  startDate: string; // yyyy-mm-dd
  endDate: string;   // yyyy-mm-dd
  category?: CarListResponseDto["category"];
  transmission?: CarListResponseDto["transmission"];
  fuelType?: CarListResponseDto["fuelType"];
  minSeats?: number;
  maxPrice?: number;
  page?: number;
  size?: number;
  sort?: string[];
};

export function findAvailableCars(params: AvailabilityParams) {
  return request<PageCarListResponseDto>(api.GET("/api/v1/cars/available", { params: { query: params } }));
}

// Car catalog queries
export type CarFilterParams = {
  page?: number;
  size?: number;
  category?: CarListResponseDto["category"];
  transmission?: CarListResponseDto["transmission"];
  fuelType?: CarListResponseDto["fuelType"];
  minSeats?: number;
  maxPrice?: number;
  search?: string;
  sort?: string[];
};

export function listCars(params: CarFilterParams = {}) {
  return request<PageCarListResponseDto>(api.GET("/api/v1/cars", { params: { query: params } }));
}

export type CarResponseDto = components["schemas"]["CarResponseDto"];

export function getCarById(id: number) {
  return request<CarResponseDto>(api.GET("/api/v1/cars/{id}", { params: { path: { id } } }));
}

// Customer queries
export type PageCustomerResponseDto = components["schemas"]["PageCustomerResponseDto"];
export type CustomerResponseDto = components["schemas"]["CustomerResponseDto"];
export type CustomerRequestDto = components["schemas"]["CustomerRequestDto"];

export type CustomerSearchParams = {
  page?: number;
  size?: number;
  search?: string; // Search by name, email, phone, or city
  sort?: string[];
};

export function searchCustomers(params: CustomerSearchParams = {}) {
  // The searchany endpoint matches first/last name, email, phone, city and driver license
  return request<PageCustomerResponseDto>(api.GET("/api/v1/customers/searchany", { params: { query: params as any } }));
}

export function listCustomers(params: CustomerSearchParams = {}) {
  // Use the search endpoint if search parameter is provided for better results
  if (params.search) {
    return searchCustomers(params);
  }
  return request<PageCustomerResponseDto>(api.GET("/api/v1/customers", { params: { query: params } }));
}

export function getCustomerById(id: number) {
  return request<CustomerResponseDto>(api.GET("/api/v1/customers/{id}", { params: { path: { id } } }));
}

export function createCustomer(customer: CustomerRequestDto) {
  return request<CustomerResponseDto>(api.POST("/api/v1/customers", { body: customer }));
}

export function updateCustomer(id: number, customer: CustomerRequestDto) {
  return request<CustomerResponseDto>(api.PUT("/api/v1/customers/{id}", {
    params: { path: { id } },
    body: customer
  }));
}

// Reservation queries
export type PageReservationResponseDto = components["schemas"]["PageReservationResponseDto"];
export type ReservationResponseDto = components["schemas"]["ReservationResponseDto"];
export type ReservationRequestDto = components["schemas"]["ReservationRequestDto"];

export type ReservationSearchParams = {
  page?: number;
  size?: number;
  search?: string; // multi-field search: customer name/email/phone, reservation ID, car, branch
  customerId?: number;
  carId?: number;
  status?: ReservationResponseDto["status"];
  startDate?: string; // yyyy-mm-dd
  endDate?: string;   // yyyy-mm-dd
  sort?: string[];
};

export function listReservations(params: ReservationSearchParams = {}) {
  return request<PageReservationResponseDto>(api.GET("/api/v1/reservations", { params: { query: params } }));
}

export function getReservationById(id: number) {
  return request<ReservationResponseDto>(api.GET("/api/v1/reservations/{id}", { params: { path: { id } } }));
}

export function createReservation(reservation: ReservationRequestDto) {
  return request<ReservationResponseDto>(api.POST("/api/v1/reservations", { body: reservation }));
}

/** Only PENDING reservations can be updated. */
export function updateReservation(id: number, reservation: ReservationRequestDto) {
  return request<ReservationResponseDto>(api.PUT("/api/v1/reservations/{id}", {
    params: { path: { id } },
    body: reservation
  }));
}

export function confirmReservation(id: number) {
  return request<ReservationResponseDto>(api.POST("/api/v1/reservations/{id}/confirm", { params: { path: { id } } }));
}

export function cancelReservation(id: number) {
  return request<ReservationResponseDto>(api.POST("/api/v1/reservations/{id}/cancel", { params: { path: { id } } }));
}

export type ReservationPickupRequestDto = components["schemas"]["ReservationPickupRequestDto"];
export type ReservationReturnRequestDto = components["schemas"]["ReservationReturnRequestDto"];

/** Hand the car over (CONFIRMED -> ACTIVE). */
export function pickUpReservation(id: number, body?: ReservationPickupRequestDto) {
  return request<ReservationResponseDto>(api.POST("/api/v1/reservations/{id}/pickup", { params: { path: { id } }, body }));
}

/** Car returned (ACTIVE -> COMPLETED). */
export function completeReservation(id: number, body?: ReservationReturnRequestDto) {
  return request<ReservationResponseDto>(api.POST("/api/v1/reservations/{id}/complete", { params: { path: { id } }, body }));
}

// Maintenance queries
export type PageMaintenanceResponseDto = components["schemas"]["PageMaintenanceResponseDto"];
export type MaintenanceResponseDto = components["schemas"]["MaintenanceResponseDto"];
export type MaintenanceScheduleRequestDto = components["schemas"]["MaintenanceScheduleRequestDto"];
export type MaintenanceUpdateRequestDto = components["schemas"]["MaintenanceUpdateRequestDto"];
export type MaintenanceCompleteRequestDto = components["schemas"]["MaintenanceCompleteRequestDto"];
export type MaintenanceStatus = NonNullable<MaintenanceResponseDto["status"]>;
export type MaintenanceType = NonNullable<MaintenanceResponseDto["maintenanceType"]>;

export type MaintenanceSearchParams = {
  page?: number;
  size?: number;
  carId?: number;
  status?: MaintenanceStatus;
  maintenanceType?: MaintenanceType;
  branchId?: number;
  startDate?: string; // yyyy-mm-dd, scheduled on or after
  endDate?: string;   // yyyy-mm-dd, scheduled on or before
};

export function listMaintenance(params: MaintenanceSearchParams = {}) {
  return request<PageMaintenanceResponseDto>(api.GET("/api/v1/maintenance", { params: { query: params } }));
}

export function getMaintenance(id: number) {
  return request<MaintenanceResponseDto>(api.GET("/api/v1/maintenance/{id}", { params: { path: { id } } }));
}

export function scheduleMaintenance(body: MaintenanceScheduleRequestDto) {
  return request<MaintenanceResponseDto>(api.POST("/api/v1/maintenance/schedule", { body }));
}

export function updateMaintenance(id: number, body: MaintenanceUpdateRequestDto) {
  return request<MaintenanceResponseDto>(api.PUT("/api/v1/maintenance/{id}", { params: { path: { id } }, body }));
}

export function startMaintenance(id: number) {
  return request<MaintenanceResponseDto>(api.POST("/api/v1/maintenance/{id}/start", { params: { path: { id } } }));
}

export function completeMaintenance(id: number, body: MaintenanceCompleteRequestDto) {
  return request<MaintenanceResponseDto>(api.POST("/api/v1/maintenance/{id}/complete", { params: { path: { id } }, body }));
}

export function cancelMaintenance(id: number) {
  return request<MaintenanceResponseDto>(api.POST("/api/v1/maintenance/{id}/cancel", { params: { path: { id } } }));
}

export function listCarsDueForService(withinDays = 14) {
  return request<CarResponseDto[]>(api.GET("/api/v1/maintenance/due-cars", { params: { query: { withinDays } } }));
}

// Application settings
export type SettingsResponseDto = components["schemas"]["SettingsResponseDto"];
export type SettingsRequestDto = components["schemas"]["SettingsRequestDto"];
export type MileageUnit = NonNullable<SettingsResponseDto["mileageUnit"]>;

export function getSettings() {
  return request<SettingsResponseDto>(api.GET("/api/v1/settings"));
}

export function updateSettings(settings: SettingsRequestDto) {
  return request<SettingsResponseDto>(api.PUT("/api/v1/settings", { body: settings }));
}
