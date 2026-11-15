import { setSignedIn, type AuthUser } from "@/lib/auth/authStore";
import { ALL_PERMISSIONS, type Permission } from "@/lib/auth/permissions";

export type TestRole = "STAFF" | "MANAGER" | "ADMIN";

// The permissions each role holds, mirroring the backend's RolePermissions. The backend stays the
// source of truth; these only let a test render the UI as someone with that role.
const STAFF_PERMISSIONS: Permission[] = ["CUSTOMER_MANAGE", "RESERVATION_MANAGE", "MAINTENANCE_SCHEDULE"];

const MANAGER_PERMISSIONS: Permission[] = [
  ...STAFF_PERMISSIONS,
  "CUSTOMER_DELETE",
  "CAR_MANAGE",
  "MAINTENANCE_MANAGE",
  "USER_VIEW",
  "USER_CREATE_STAFF",
];

const PERMISSIONS: Record<TestRole, Permission[]> = {
  STAFF: STAFF_PERMISSIONS,
  MANAGER: MANAGER_PERMISSIONS,
  ADMIN: [...ALL_PERMISSIONS],
};

export const TEST_USERS: Record<TestRole, AuthUser> = {
  STAFF: {
    id: 3, username: "john.doe", email: "john.doe@rentacar.com", firstName: "John", lastName: "Doe",
    enabled: true, roles: ["STAFF"], permissions: PERMISSIONS.STAFF,
    branchId: 1, branchName: "Downtown Branch",
  },
  MANAGER: {
    id: 2, username: "maria.manager", email: "maria.manager@rentacar.com", firstName: "Maria", lastName: "Manager",
    enabled: true, roles: ["MANAGER"], permissions: PERMISSIONS.MANAGER,
    branchId: 1, branchName: "Downtown Branch",
  },
  ADMIN: {
    id: 1, username: "admin", email: "admin@rentacar.com", firstName: "System", lastName: "Administrator",
    enabled: true, roles: ["ADMIN"], permissions: PERMISSIONS.ADMIN,
  },
};

/** Renders the following component as signed in with the given role. */
export function signInAs(role: TestRole, overrides: Partial<AuthUser> = {}): AuthUser {
  const user = { ...TEST_USERS[role], ...overrides };
  setSignedIn("test-access-token", user);
  return user;
}
