import { api } from "./client";
import type { components } from "./schema";
import { normalizeError } from "./errors";

export type PageBranchResponseDto = components["schemas"]["PageBranchResponseDto"];
export type BranchResponseDto = components["schemas"]["BranchResponseDto"];
export type BranchRequestDto = components["schemas"]["BranchRequestDto"];
export type PageCarListResponseDto = components["schemas"]["PageCarListResponseDto"];
export type CarListResponseDto = components["schemas"]["CarListResponseDto"];

export type BranchSearchParams = {
  page?: number;
  size?: number;
  name?: string;
  city?: string;
  sort?: string[];
};

export async function searchBranches(params: BranchSearchParams = {}) {
  try {
    const hasNameSearch = params.name && params.name.trim();
    const hasCitySearch = params.city && params.city.trim();

    if (hasNameSearch && hasCitySearch) {
      // If both are provided, we need to combine results or prioritize one
      // For now, let's prioritize name search and filter by city on the frontend
      const searchParams = { ...params, name: params.name!.trim() };
      const res = await api.GET("/api/branches/search", { params: { query: searchParams } });
      if ((res as any).error) throw (res as any).error;
      return res.data as PageBranchResponseDto;
    } else if (hasNameSearch) {
      const searchParams = { ...params, name: params.name!.trim() };
      const res = await api.GET("/api/branches/search", { params: { query: searchParams } });
      if ((res as any).error) throw (res as any).error;
      return res.data as PageBranchResponseDto;
    } else if (hasCitySearch) {
      const cityParams = { city: params.city!.trim() };
      const res = await api.GET("/api/branches/by-city", { params: { query: cityParams } });
      if ((res as any).error) throw (res as any).error;
      // Convert array response to PageBranchResponseDto format
      return {
        content: res.data as BranchResponseDto[],
        totalElements: (res.data as BranchResponseDto[]).length,
        totalPages: 1,
        size: (res.data as BranchResponseDto[]).length,
        number: 0,
        numberOfElements: (res.data as BranchResponseDto[]).length,
        sort: [],
        pageable: {
          offset: 0,
          sort: [],
          pageNumber: 0,
          pageSize: (res.data as BranchResponseDto[]).length,
          paged: false,
          unpaged: true
        },
        first: true,
        last: true,
        empty: (res.data as BranchResponseDto[]).length === 0
      } as PageBranchResponseDto;
    } else {
      return listBranches(params);
    }
  } catch (error) {
    throw normalizeError(error);
  }
}

export async function listBranches(params?: { page?: number; size?: number; sort?: string[] }) {
  try {
    const res = await api.GET("/api/branches", { params: { query: params } });
    if ((res as any).error) throw (res as any).error;
    return res.data as PageBranchResponseDto;
  } catch (error) {
    throw normalizeError(error);
  }
}

export async function createBranch(branch: BranchRequestDto) {
  try {
    const res = await api.POST("/api/branches", { body: branch });
    if ((res as any).error) throw (res as any).error;
    return res.data as BranchResponseDto;
  } catch (error) {
    throw normalizeError(error);
  }
}

export async function updateBranch(id: number, branch: BranchRequestDto) {
  try {
    const res = await api.PUT("/api/branches/{id}", {
      params: { path: { id } },
      body: branch
    });
    if ((res as any).error) throw (res as any).error;
    return res.data as BranchResponseDto;
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
  vin?: string;
  make?: string;
  model?: string;
  year?: number;
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

export type CarRequestDto = components["schemas"]["CarRequestDto"];

export async function createCar(car: CarRequestDto) {
  try {
    const res = await api.POST("/api/cars", { body: car });
    if ((res as any).error) throw (res as any).error;
    return res.data as CarResponseDto;
  } catch (error) {
    throw normalizeError(error);
  }
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
  customerId?: number;
  carId?: number;
  status?: ReservationResponseDto["status"];
  startDate?: string; // yyyy-mm-dd
  endDate?: string;   // yyyy-mm-dd
  search?: string;    // Multi-field search term
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
