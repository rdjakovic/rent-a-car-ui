import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { initSession } from "@/lib/auth/session";
import { useAuthStore } from "@/lib/auth/authStore";

/**
 * Wraps the pages that need a signed-in user. While the session is being looked up it shows a placeholder;
 * without a session it goes to the login page, which brings the user back here afterwards.
 */
export default function RequireAuth() {
  const status = useAuthStore((state) => state.status);
  const signedOutByUser = useAuthStore((state) => state.signedOutByUser);
  const location = useLocation();

  if (status === "loading") {
    return (
      <div className="container mx-auto py-10 px-4" role="status" aria-label="Loading">
        <Skeleton className="h-8 w-64" />
      </div>
    );
  }

  if (status === "unavailable") {
    return (
      <div className="container mx-auto py-10 px-4 grid gap-4 max-w-md" role="alert">
        <h2 className="text-xl font-semibold">Can't reach the server</h2>
        <p className="text-muted-foreground">Check your connection and try again.</p>
        <div>
          <Button onClick={() => void initSession()}>Try again</Button>
        </div>
      </div>
    );
  }

  if (status === "anonymous") {
    // After signing out on purpose there is nothing to come back to
    const returnTo = signedOutByUser ? "" : `?returnTo=${encodeURIComponent(location.pathname + location.search)}`;
    return <Navigate to={`/login${returnTo}`} replace />;
  }

  return <Outlet />;
}
