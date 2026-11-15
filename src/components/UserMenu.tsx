import { Link, useNavigate } from "react-router-dom";
import { KeyRound, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logout } from "@/lib/auth/session";
import { useAuthStore, type AuthUser } from "@/lib/auth/authStore";

const ROLE_LABELS: Record<string, string> = { STAFF: "Staff", MANAGER: "Manager", ADMIN: "Administrator" };

export function roleLabel(user: AuthUser) {
  const role = user.roles?.[0];
  return role ? (ROLE_LABELS[role] ?? role) : "";
}

export function fullName(user: AuthUser) {
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || "";
}

function initials(user: AuthUser) {
  return ((user.firstName?.[0] ?? "") + (user.lastName?.[0] ?? "") || (user.username?.[0] ?? "?")).toUpperCase();
}

/** Signs out; the guard sends the user to the login page and the app drops the user's data. */
export function useLogout() {
  const navigate = useNavigate();
  return async () => {
    await logout();
    navigate("/login", { replace: true });
  };
}

/** Who is signed in, with Log out. A compact round button so the header keeps its room. */
export default function UserMenu() {
  const user = useAuthStore((state) => state.user);
  const signOut = useLogout();
  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Account menu for ${fullName(user)}`}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-semibold hover:bg-white/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
      >
        {initials(user)}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="font-medium">{fullName(user)}</div>
          <div className="text-xs text-muted-foreground">
            {[roleLabel(user), user.branchName].filter(Boolean).join(" · ")}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/change-password">
            <KeyRound className="mr-2 h-4 w-4" aria-hidden="true" />
            Change password
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void signOut()}>
          <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
