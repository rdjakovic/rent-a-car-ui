import { Link, Outlet } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCan } from "@/lib/auth/authStore";
import type { Permission } from "@/lib/auth/permissions";

/**
 * Wraps pages that only some roles may open (inside RequireAuth). Without the permission it shows why,
 * instead of sending the user to a page that would fail with a 403.
 */
export default function RequirePermission({ permission }: { permission: Permission }) {
  const can = useCan();

  if (can(permission)) {
    return <Outlet />;
  }

  return (
    <div className="container mx-auto py-10 px-4 max-w-md">
      <Card>
        <CardContent className="grid justify-items-center gap-4 py-10 text-center">
          <ShieldAlert className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
          <h2 className="text-xl font-semibold">You don't have access to this page</h2>
          <p className="text-sm text-muted-foreground">
            Ask an administrator if you need it.
          </p>
          <Button asChild>
            <Link to="/">Back to availability</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
