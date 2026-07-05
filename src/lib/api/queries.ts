import { api } from "./client";
import type { components } from "./schema";
import { normalizeError } from "./errors";

export type PageBranchResponseDto = components["schemas"]["PageBranchResponseDto"];
export type BranchResponseDto = components["schemas"]["BranchResponseDto"];
export type PageCarListResponseDto = components["schemas"]["PageCarListResponseDto"];
export type CarListResponseDto = components["schemas"]["CarListResponseDto"];

export async function listBranches(params?: { page?: number; size?: number; sort?: string[] }) {
  try {
    const res = await api.GET("/api/branches", { params: { query: params } });
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
  const res = await api.GET("/api/cars/available", { params: { query: params } });
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
  const res = await api.GET("/api/cars", { params: { query: params } });
  if ((res as any).error) throw (res as any).error;
  return res.data as PageCarListResponseDto;
}

export type CarResponseDto = components["schemas"]["CarResponseDto"];

export async function getCarById(id: number) {
  const res = await api.GET("/api/cars/{id}", { params: { path: { id } } });
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
    const res = await (api as any).GET("/api/customers/searchany", { params: { query: params } });
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
      const res = await api.GET("/api/customers", { params: { query: params } });
      if ((res as any).error) throw (res as any).error;
      return res.data as PageCustomerResponseDto;
    }
  } catch (error) {
    throw normalizeError(error);
  }
}

export async function getCustomerById(id: number) {
  const res = await api.GET("/api/customers/{id}", { params: { path: { id } } });
  if ((res as any).error) throw (res as any).error;
  return res.data as CustomerResponseDto;
}

export async function createCustomer(customer: CustomerRequestDto) {
  try {
    const res = await api.POST("/api/customers", { body: customer });
    if ((res as any).error) throw (res as any).error;
    return res.data as CustomerResponseDto;
  } catch (error) {
    throw normalizeError(error);
  }
}

export async function updateCustomer(id: number, customer: CustomerRequestDto) {
  try {
    const res = await api.PUT("/api/customers/{id}", {
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
  const res = await api.GET("/api/reservations", { params: { query: params } });
  if ((res as any).error) throw (res as any).error;
  return res.data as PageReservationResponseDto;
}

export async function getReservationById(id: number) {
  const res = await api.GET("/api/reservations/{id}", { params: { path: { id } } });
  if ((res as any).error) throw (res as any).error;
  return res.data as ReservationResponseDto;
}

export async function createReservation(reservation: ReservationRequestDto) {
  try {
    const res = await api.POST("/api/reservations", { body: reservation });
    if ((res as any).error) throw (res as any).error;
    return res.data as ReservationResponseDto;
  } catch (error) {
    throw normalizeError(error);
  }
}

export async function updateReservation(id: number, reservation: ReservationRequestDto) {
  try {
    const res = await api.PUT("/api/reservations/{id}", {
      params: { path: { id } },
      body: reservation
    });
    if ((res as any).error) throw (res as any).error;
    return res.data as ReservationResponseDto;
  } catch (error) {
    throw normalizeError(error);
  }
}

export async function confirmReservation(id: number) {
  const res = await api.POST("/api/reservations/{id}/confirm", { params: { path: { id } } });
  if ((res as any).error) throw (res as any).error;
  return res.data as ReservationResponseDto;
}

export async function cancelReservation(id: number) {
  const res = await api.POST("/api/reservations/{id}/cancel", { params: { path: { id } } });
  if ((res as any).error) throw (res as any).error;
  return res.data as ReservationResponseDto;
}

export async function completeReservation(id: number) {
  const res = await api.POST("/api/reservations/{id}/complete", { params: { path: { id } } });
  if ((res as any).error) throw (res as any).error;
  return res.data as ReservationResponseDto;
}
