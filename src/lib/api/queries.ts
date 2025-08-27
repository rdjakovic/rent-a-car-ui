import { api } from "./client";
import type { components } from "./schema";

export type PageBranchResponseDto = components["schemas"]["PageBranchResponseDto"];
export type BranchResponseDto = components["schemas"]["BranchResponseDto"];

export async function listBranches(params?: { page?: number; size?: number; sort?: string[] }) {
  const res = await api.GET("/api/branches", { params: { query: params } });
  if (res.error) throw res.error;
  return res.data as PageBranchResponseDto;
}
