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
