export type RoleName = "STAFF" | "MANAGER" | "ADMIN";

export const ROLE_LABELS: Record<RoleName, string> = { STAFF: "Staff", MANAGER: "Manager", ADMIN: "Administrator" };

const HIGHEST_FIRST: RoleName[] = ["ADMIN", "MANAGER", "STAFF"];

/**
 * The user's highest role, or undefined for an account without one. The API gives exactly one role, but the role
 * list is unordered and older data may hold several or none, so never take the first one.
 */
export function highestRole(user: { roles?: string[] }): RoleName | undefined {
  return HIGHEST_FIRST.find((role) => user.roles?.includes(role));
}
