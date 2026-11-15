import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { initSession } from "@/lib/auth/session";
import { useAuthStore } from "@/lib/auth/authStore";
import { resetFilterStores } from "@/stores/filterStore";

/**
 * Looks for a session when the app opens, and drops everything that belongs to the user (cached data and
 * saved filters) when the session ends, whether they signed out or it ran out, so the next person sees none of it.
 */
export function useSessionLifecycle() {
  const queryClient = useQueryClient();
  const status = useAuthStore((state) => state.status);

  // Calls share one request, so React StrictMode's second run doesn't send another
  useEffect(() => {
    void initSession();
  }, []);

  useEffect(() => {
    if (status === "anonymous") {
      queryClient.clear();
      resetFilterStores();
    }
  }, [status, queryClient]);
}
