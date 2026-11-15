import { create } from "zustand";
import type { components } from "@/lib/api/schema";
import type { Permission } from "./permissions";

export type AuthUser = components["schemas"]["UserResponseDto"];

/**
 * - loading: finding out whether there is a session (on page load)
 * - authenticated: signed in; `accessToken` and `user` are set
 * - anonymous: not signed in
 * - unavailable: the server couldn't be reached, so it is unknown whether there is a session
 */
export type AuthStatus = "loading" | "authenticated" | "anonymous" | "unavailable";

type AuthState = {
  status: AuthStatus;
  /** Kept in memory only: a reload gets a new one from the refresh cookie */
  accessToken: string | null;
  user: AuthUser | null;
  /** The user chose to sign out (as opposed to the session running out): the login page then forgets where they were */
  signedOutByUser: boolean;
};

export const useAuthStore = create<AuthState>(() => ({ status: "loading", accessToken: null, user: null, signedOutByUser: false }));

export function setSignedIn(accessToken: string, user: AuthUser) {
  useAuthStore.setState({ status: "authenticated", accessToken, user, signedOutByUser: false });
}

export function setSignedOut(byUser = false) {
  useAuthStore.setState({ status: "anonymous", accessToken: null, user: null, signedOutByUser: byUser });
}

/** Updates the signed-in user's details (e.g. after they edited their own account); the token stays. */
export function setAuthUser(user: AuthUser) {
  useAuthStore.setState({ user });
}

/** Back to the state of a fresh page load (tests, and "try again" after the server was unreachable) */
export function resetAuth() {
  useAuthStore.setState({ status: "loading", accessToken: null, user: null, signedOutByUser: false });
}

/** The signed-in user's token, or null */
export function getAccessToken() {
  return useAuthStore.getState().accessToken;
}

/** Whether the signed-in user holds a permission (the backend decides which roles have which). */
export function hasPermission(permission: string) {
  return !!useAuthStore.getState().user?.permissions?.includes(permission);
}

/** A `can(permission)` check for components: re-renders when the signed-in user changes. */
export function useCan() {
  const permissions = useAuthStore((state) => state.user?.permissions);
  return (permission: Permission) => permissions?.includes(permission) ?? false;
}
