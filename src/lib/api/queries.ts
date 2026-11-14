import { api } from "./client";
import type { components } from "./schema";
import { normalizeError } from "./errors";

export type PageBranchResponseDto = components["schemas"]["PageBranchResponseDto"];
export type BranchResponseDto = components["schemas"]["BranchResponseDto"];
export type PageCarListResponseDto = components["schemas"]["PageCarListResponseDto"];
export type CarListResponseDto = components["schemas"]["CarListResponseDto"];

export async function listBranches(params?: { page?: number; size?: number; sort?: string[] }) {
  try {
    const res = await api.GET("/api/v1/branches", { params: { query: params } });
    if ((res as any).error) throw (res as any).error;
    return res.data as PageBranchResponseDto;
  } catch (error) {
    throw normalizeError(error);
  }
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

export async function findAvailableCars(params: AvailabilityParams) {
  const res = await api.GET("/api/v1/cars/available", { params: { query: params } });
  if ((res as any).error) throw (res as any).error;
  return res.data as PageCarListResponseDto;
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

export async function listCars(params: CarFilterParams = {}) {
  const res = await api.GET("/api/v1/cars", { params: { query: params } });
  if ((res as any).error) throw (res as any).error;
  return res.data as PageCarListResponseDto;
}

export type CarResponseDto = components["schemas"]["CarResponseDto"];

export async function getCarById(id: number) {
  const res = await api.GET("/api/v1/cars/{id}", { params: { path: { id } } });
  if ((res as any).error) throw (res as any).error;
  return res.data as CarResponseDto;
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

export async function searchCustomers(params: CustomerSearchParams = {}) {
  try {
    // Use the new searchany endpoint for enhanced search
    const res = await (api as any).GET("/api/v1/customers/searchany", { params: { query: params } });
    if ((res as any).error) throw (res as any).error;
    return res.data as PageCustomerResponseDto;
  } catch (error) {
    throw normalizeError(error);
  }
}

export async function listCustomers(params: CustomerSearchParams = {}) {
  try {
    // Use the search endpoint if search parameter is provided for better results
    if (params.search) {
      return searchCustomers(params);
    } else {
      // Use the regular list endpoint for non-search queries
      const res = await api.GET("/api/v1/customers", { params: { query: params } });
      if ((res as any).error) throw (res as any).error;
      return res.data as PageCustomerResponseDto;
    }
  } catch (error) {
    throw normalizeError(error);
  }
}

export async function getCustomerById(id: number) {
  const res = await api.GET("/api/v1/customers/{id}", { params: { path: { id } } });
  if ((res as any).error) throw (res as any).error;
  return res.data as CustomerResponseDto;
}

export async function createCustomer(customer: CustomerRequestDto) {
  try {
    const res = await api.POST("/api/v1/customers", { body: customer });
    if ((res as any).error) throw (res as any).error;
    return res.data as CustomerResponseDto;
  } catch (error) {
    throw normalizeError(error);
  }
}

export async function updateCustomer(id: number, customer: CustomerRequestDto) {
  try {
    const res = await api.PUT("/api/v1/customers/{id}", {
      params: { path: { id } },
      body: customer
    });
    if ((res as any).error) throw (res as any).error;
    return res.data as CustomerResponseDto;
  } catch (error) {
    throw normalizeError(error);
  }
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

export async function listReservations(params: ReservationSearchParams = {}) {
  const res = await api.GET("/api/v1/reservations", { params: { query: params } });
  if ((res as any).error) throw (res as any).error;
  return res.data as PageReservationResponseDto;
}

export async function getReservationById(id: number) {
  const res = await api.GET("/api/v1/reservations/{id}", { params: { path: { id } } });
  if ((res as any).error) throw (res as any).error;
  return res.data as ReservationResponseDto;
}

export async function createReservation(reservation: ReservationRequestDto) {
  try {
    const res = await api.POST("/api/v1/reservations", { body: reservation });
    if ((res as any).error) throw (res as any).error;
    return res.data as ReservationResponseDto;
  } catch (error) {
    throw normalizeError(error);
  }
}

/** Only PENDING reservations can be updated. Failures are thrown as { status, ...problemDetail }. */
export async function updateReservation(id: number, reservation: ReservationRequestDto) {
  const res = await api.PUT("/api/v1/reservations/{id}", {
    params: { path: { id } },
    body: reservation
  });
  if (!res.response.ok) throw { status: res.response.status, ...(res as any).error };
  return res.data as ReservationResponseDto;
}

export async function confirmReservation(id: number) {
  const res = await api.POST("/api/v1/reservations/{id}/confirm", { params: { path: { id } } });
  if ((res as any).error) throw (res as any).error;
  return res.data as ReservationResponseDto;
}

export async function cancelReservation(id: number) {
  const res = await api.POST("/api/v1/reservations/{id}/cancel", { params: { path: { id } } });
  if ((res as any).error) throw (res as any).error;
  return res.data as ReservationResponseDto;
}

export type ReservationPickupRequestDto = components["schemas"]["ReservationPickupRequestDto"];
export type ReservationReturnRequestDto = components["schemas"]["ReservationReturnRequestDto"];

/** Hand the car over (CONFIRMED -> ACTIVE). Failures are thrown as { status, ...problemDetail }. */
export async function pickUpReservation(id: number, body?: ReservationPickupRequestDto) {
  const res = await api.POST("/api/v1/reservations/{id}/pickup", { params: { path: { id } }, body });
  if (!res.response.ok) throw { status: res.response.status, ...(res as any).error };
  return res.data as ReservationResponseDto;
}

/** Car returned (ACTIVE -> COMPLETED). Failures are thrown as { status, ...problemDetail }. */
export async function completeReservation(id: number, body?: ReservationReturnRequestDto) {
  const res = await api.POST("/api/v1/reservations/{id}/complete", { params: { path: { id } }, body });
  if (!res.response.ok) throw { status: res.response.status, ...(res as any).error };
  return res.data as ReservationResponseDto;
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

// Maintenance calls report failures as { status, ...problemDetail } so callers can show the
// backend's reason (e.g. a reservation conflict) and recognise a 403, which has no body.
function maintenanceError(res: { response: Response; error?: unknown }) {
  return { status: res.response.status, ...(res.error as object | undefined) };
}

export async function listMaintenance(params: MaintenanceSearchParams = {}) {
  const res = await api.GET("/api/v1/maintenance", { params: { query: params } });
  if (!res.response.ok) throw maintenanceError(res);
  return res.data as PageMaintenanceResponseDto;
}

export async function getMaintenance(id: number) {
  const res = await api.GET("/api/v1/maintenance/{id}", { params: { path: { id } } });
  if (!res.response.ok) throw maintenanceError(res);
  return res.data as MaintenanceResponseDto;
}

export async function scheduleMaintenance(body: MaintenanceScheduleRequestDto) {
  const res = await api.POST("/api/v1/maintenance/schedule", { body });
  if (!res.response.ok) throw maintenanceError(res);
  return res.data as MaintenanceResponseDto;
}

export async function updateMaintenance(id: number, body: MaintenanceUpdateRequestDto) {
  const res = await api.PUT("/api/v1/maintenance/{id}", { params: { path: { id } }, body });
  if (!res.response.ok) throw maintenanceError(res);
  return res.data as MaintenanceResponseDto;
}

export async function startMaintenance(id: number) {
  const res = await api.POST("/api/v1/maintenance/{id}/start", { params: { path: { id } } });
  if (!res.response.ok) throw maintenanceError(res);
  return res.data as MaintenanceResponseDto;
}

export async function completeMaintenance(id: number, body: MaintenanceCompleteRequestDto) {
  const res = await api.POST("/api/v1/maintenance/{id}/complete", { params: { path: { id } }, body });
  if (!res.response.ok) throw maintenanceError(res);
  return res.data as MaintenanceResponseDto;
}

export async function cancelMaintenance(id: number) {
  const res = await api.POST("/api/v1/maintenance/{id}/cancel", { params: { path: { id } } });
  if (!res.response.ok) throw maintenanceError(res);
  return res.data as MaintenanceResponseDto;
}

export async function listCarsDueForService(withinDays = 14) {
  const res = await api.GET("/api/v1/maintenance/due-cars", { params: { query: { withinDays } } });
  if (!res.response.ok) throw maintenanceError(res);
  return res.data as CarResponseDto[];
}

// Application settings
export type SettingsResponseDto = components["schemas"]["SettingsResponseDto"];
export type SettingsRequestDto = components["schemas"]["SettingsRequestDto"];
export type MileageUnit = NonNullable<SettingsResponseDto["mileageUnit"]>;

export async function getSettings() {
  const res = await api.GET("/api/v1/settings");
  if (!res.response.ok) throw { status: res.response.status, ...(res as any).error };
  return res.data as SettingsResponseDto;
}

export async function updateSettings(settings: SettingsRequestDto) {
  const res = await api.PUT("/api/v1/settings", { body: settings });
  // A 403 from the security chain has no body, so check the status rather than res.error
  if (!res.response.ok) throw { status: res.response.status, ...(res as any).error };
  return res.data as SettingsResponseDto;
}
