/**
 * The permission names the backend sends with the signed-in user (`GET /auth/me`, login and refresh).
 * Which role holds which permission is decided by the backend; the UI only checks whether a name is present.
 */
export const ALL_PERMISSIONS = [
  "CUSTOMER_MANAGE",
  "CUSTOMER_DELETE",
  "RESERVATION_MANAGE",
  "MAINTENANCE_SCHEDULE",
  "MAINTENANCE_MANAGE",
  "CAR_MANAGE",
  "CAR_DELETE",
  "BRANCH_MANAGE",
  "SETTINGS_MANAGE",
  "USER_VIEW",
  "USER_CREATE_STAFF",
  "USER_MANAGE",
] as const;

export type Permission = (typeof ALL_PERMISSIONS)[number];
