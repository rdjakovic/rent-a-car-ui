import { setSignedIn, type AuthUser } from "@/lib/auth/authStore";
import { MOCK_ADMIN, MOCK_MANAGER, MOCK_STAFF } from "@/lib/mocks/handlers";

export type TestRole = "STAFF" | "MANAGER" | "ADMIN";

// The same sample accounts the mock login serves (their rights mirror the backend's RolePermissions)
export const TEST_USERS: Record<TestRole, AuthUser> = { STAFF: MOCK_STAFF, MANAGER: MOCK_MANAGER, ADMIN: MOCK_ADMIN };

/** Renders the following component as signed in with the given role. */
export function signInAs(role: TestRole, overrides: Partial<AuthUser> = {}): AuthUser {
  const user = { ...TEST_USERS[role], ...overrides };
  setSignedIn("test-access-token", user);
  return user;
}
