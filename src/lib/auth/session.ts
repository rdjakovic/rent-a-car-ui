import createClient from "openapi-fetch";
import type { paths } from "@/lib/api/schema";
import { baseUrl, credentials } from "@/lib/api/base";
import { ApiError, apiErrorFromResponse, normalizeError } from "@/lib/api/errors";
import { getAccessToken, resetAuth, setSignedIn, setSignedOut, useAuthStore } from "./authStore";

/**
 * Sign-in sessions. The backend gives a short-lived access token (kept in memory, sent as a Bearer header)
 * and an httpOnly refresh cookie that this code never sees: it only calls /auth/refresh, which renews both.
 * This module talks to the auth endpoints with its own client, so it doesn't depend on the main API client
 * (which depends on it for the token).
 */
const authApi = createClient<paths>({ baseUrl, credentials });

const AUTH_PATH = "/api/v1/auth/";

/** Where requests for auth endpoints are not retried after a 401: a failed login or refresh is a final answer */
function isAuthRequest(url: string) {
  return new URL(url, "http://localhost").pathname.startsWith(AUTH_PATH);
}

type RefreshResult = "ok" | "ended" | "unavailable";

/**
 * Two tabs refreshing at the same moment would both present the same cookie, and the backend (which replaces
 * the cookie on every refresh) would take the second one for a copied token and end the session. So refreshes
 * take turns across tabs (Web Locks), and within a tab concurrent callers share one request.
 */
let refreshInFlight: Promise<RefreshResult> | null = null;

export function refreshSession(): Promise<RefreshResult> {
  refreshInFlight ??= withTabLock(doRefresh).finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

function withTabLock<T>(task: () => Promise<T>): Promise<T> {
  return navigator.locks ? navigator.locks.request("rent-a-car-refresh", task) : task();
}

async function doRefresh(): Promise<RefreshResult> {
  let res;
  try {
    res = await authApi.POST("/api/v1/auth/refresh");
  } catch {
    return unavailable();
  }
  if (res.response.ok && res.data?.access_token && res.data.user) {
    setSignedIn(res.data.access_token, res.data.user);
    return "ok";
  }
  if (res.response.status === 401) {
    setSignedOut();
    return "ended";
  }
  return unavailable();
}

/** The server couldn't answer: only a page that has no session state yet shows that; a signed-in user stays signed in */
function unavailable(): RefreshResult {
  if (useAuthStore.getState().status === "loading") {
    useAuthStore.setState({ status: "unavailable" });
  }
  return "unavailable";
}

/** Finds out on page load whether the refresh cookie still holds a session. */
export async function initSession(): Promise<void> {
  if (useAuthStore.getState().status === "unavailable") {
    resetAuth();
  }
  await refreshSession();
}

/** Signs in with a username or email. Throws an ApiError with the backend's reason (e.g. "Invalid username or password"). */
export async function login(username: string, password: string) {
  let res;
  try {
    res = await authApi.POST("/api/v1/auth/login", { body: { username, password } });
  } catch (error) {
    throw normalizeError(error);
  }
  if (!res.response.ok || !res.data?.access_token || !res.data.user) {
    const status = res.response.status;
    const problem = (res.error && typeof res.error === "object" ? res.error : {}) as { detail?: string };
    // The generic 401 text says "log in"; here the backend's own reason is the useful one
    if ((status === 401 || status === 429) && problem.detail) {
      throw new ApiError({ message: problem.detail, status, detail: problem.detail });
    }
    throw apiErrorFromResponse(status, res.error);
  }
  setSignedIn(res.data.access_token, res.data.user);
  return res.data.user;
}

/** Ends the session on the server (best effort) and here. The caller clears what belongs to the user. */
export async function logout() {
  try {
    await authApi.POST("/api/v1/auth/logout");
  } catch {
    // Signing out locally still matters if the server can't be reached
  }
  setSignedOut(true);
}

function withToken(request: Request) {
  const token = getAccessToken();
  if (token) request.headers.set("Authorization", `Bearer ${token}`);
}

/**
 * fetch for the main API client: adds the access token, and after a 401 renews it once and repeats the call.
 * If the session is over, the response stays a 401 and the store says anonymous (the app shows the login page).
 */
export async function authFetch(request: Request): Promise<Response> {
  const retry = isAuthRequest(request.url) ? null : request.clone();
  withToken(request);
  // Resolved on each call (not captured), so tests and the browser can replace it
  const response = await globalThis.fetch(request);
  if (response.status !== 401 || !retry) return response;

  if ((await refreshSession()) !== "ok") return response;
  withToken(retry);
  return globalThis.fetch(retry);
}
