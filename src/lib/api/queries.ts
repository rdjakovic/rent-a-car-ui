import { api } from "./client";
import type { components } from "./schema";

export type PageBranchResponseDto = components["schemas"]["PageBranchResponseDto"];
export type BranchResponseDto = components["schemas"]["BranchResponseDto"];
export type PageCarListResponseDto = components["schemas"]["PageCarListResponseDto"];
export type CarListResponseDto = components["schemas"]["CarListResponseDto"];

export async function listBranches(params?: { page?: number; size?: number; sort?: string[] }) {
  const res = await api.GET("/api/branches", { params: { query: params } });
  if (res.error) throw res.error;
  return res.data as PageBranchResponseDto;
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
  if (res.error) throw res.error;
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
  if (res.error) throw res.error;
  return res.data as PageCarListResponseDto;
}

export type CarResponseDto = components["schemas"]["CarResponseDto"];

export async function getCarById(id: number) {
  const res = await api.GET("/api/cars/{id}", { params: { path: { id } } });
  if (res.error) throw res.error;
  return res.data as CarResponseDto;
}

// Customer queries
export type PageCustomerResponseDto = components["schemas"]["PageCustomerResponseDto"];
export type CustomerResponseDto = components["schemas"]["CustomerResponseDto"];
export type CustomerRequestDto = components["schemas"]["CustomerRequestDto"];

export type CustomerSearchParams = {
  page?: number;
  size?: number;
  search?: string; // Search by name, email, or phone
  sort?: string[];
};

export async function listCustomers(params: CustomerSearchParams = {}) {
  const res = await api.GET("/api/customers", { params: { query: params } });
  if (res.error) throw res.error;
  return res.data as PageCustomerResponseDto;
}

export async function getCustomerById(id: number) {
  const res = await api.GET("/api/customers/{id}", { params: { path: { id } } });
  if (res.error) throw res.error;
  return res.data as CustomerResponseDto;
}

export async function createCustomer(customer: CustomerRequestDto) {
  const res = await api.POST("/api/customers", { body: customer });
  if (res.error) throw res.error;
  return res.data as CustomerResponseDto;
}

export async function updateCustomer(id: number, customer: CustomerRequestDto) {
  const res = await api.PUT("/api/customers/{id}", { 
    params: { path: { id } }, 
    body: customer 
  });
  if (res.error) throw res.error;
  return res.data as CustomerResponseDto;
}
