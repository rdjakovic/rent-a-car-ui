import { useQuery } from "@tanstack/react-query";
import { getSettings } from "@/lib/api/queries";

export const SETTINGS_QUERY_KEY = ["settings"] as const;

/** Application settings (e.g. mileage unit), shared by every page that needs them. */
export function useSettings() {
  return useQuery({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: getSettings,
    staleTime: 5 * 60_000,
  });
}
