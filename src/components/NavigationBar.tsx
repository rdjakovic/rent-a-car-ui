import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import UserMenu, { fullName, roleLabel, useLogout } from "@/components/UserMenu";
import { useAuthStore, useCan } from "@/lib/auth/authStore";
import type { Permission } from "@/lib/auth/permissions";

export type NavItem = { to: string; label: string; permission?: Permission };

export const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Availability" },
  { to: "/branches", label: "Branches" },
  { to: "/cars", label: "Cars" },
  { to: "/customers", label: "Customers" },
  { to: "/reservations", label: "Reservations" },
  { to: "/maintenance", label: "Maintenance" },
  { to: "/settings", label: "Settings" },
  { to: "/users", label: "Users", permission: "USER_VIEW" },
];

const linkClass = (isActive: boolean) =>
  cn(
    "text-white/90 hover:text-white hover:bg-brand-orange/90 py-2 rounded-lg transition-colors whitespace-nowrap",
    isActive && "underline underline-offset-4 decoration-brand-orange decoration-2",
  );

/**
 * Header with the app navigation. The seven links fit in one row from the xl breakpoint (1280px) with
 * tight spacing, and with wide spacing from 2xl; below xl they move into a menu behind a hamburger button.
 */
export default function NavigationBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const can = useCan();
  const signOut = useLogout();
  const items = NAV_ITEMS.filter((item) => !item.permission || can(item.permission));

  // Close the menu after navigating (also covers the browser's back/forward buttons)
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <header className="bg-transparent">
      <div className="container mx-auto px-4 py-4">
        <div className="rounded-2xl bg-brand-navy text-white shadow-lg">
          <div className="flex items-center gap-3 px-4 py-3">
            <NavLink to="/" className="flex shrink-0 items-center gap-3 hover:opacity-90 transition-opacity">
              <img src="/logo.svg" alt="logo" className="h-10 w-10 sm:h-12 sm:w-12" />
              <h1 className="text-xl sm:text-2xl font-semibold whitespace-nowrap">
                NextStep <span className="text-brand-emerald">RentACar</span>
              </h1>
            </NavLink>

            <nav aria-label="Main" className="ml-auto hidden xl:flex gap-1 2xl:gap-6">
              {items.map((item) => (
                <NavLink key={item.to} to={item.to} className={({ isActive }) => cn(linkClass(isActive), "px-3 2xl:px-6")}>
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className="hidden xl:block">
              <UserMenu />
            </div>

            <button
              type="button"
              className="ml-auto xl:hidden rounded-lg p-2 hover:bg-white/10 transition-colors"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
            </button>
          </div>

          {menuOpen && (
            <nav id="mobile-menu" aria-label="Mobile" className="xl:hidden border-t border-white/10 px-4 py-2">
              <ul className="flex flex-col gap-1">
                {items.map((item) => (
                  <li key={item.to}>
                    <NavLink to={item.to} className={({ isActive }) => cn(linkClass(isActive), "block px-4")}>
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
              {user && (
                <div className="mt-2 grid gap-3 border-t border-white/10 px-4 py-3">
                  <div className="min-w-0 text-sm">
                    <div className="truncate font-medium">{fullName(user)}</div>
                    <div className="truncate text-xs text-white/70">
                      {[roleLabel(user), user.branchName].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <NavLink to="/change-password" className="rounded-lg px-3 py-2 text-sm hover:bg-white/10 transition-colors">
                      Change password
                    </NavLink>
                    <button
                      type="button"
                      onClick={() => void signOut()}
                      className="rounded-lg px-3 py-2 text-sm hover:bg-white/10 transition-colors"
                    >
                      Log out
                    </button>
                  </div>
                </div>
              )}
            </nav>
          )}
        </div>
      </div>
    </header>
  );
}
