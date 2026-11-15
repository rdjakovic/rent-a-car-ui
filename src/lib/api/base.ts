/**
 * Where the API is. Empty by default: calls go to the same origin, which the dev server proxies to the backend.
 * Set VITE_API_BASE_URL only for an API on another host (the backend must then allow this origin).
 */
export const baseUrl = (import.meta.env.VITE_API_BASE_URL as string) || "";

/** The refresh cookie is sent along with calls to another host only if asked for */
export const credentials: RequestCredentials = baseUrl ? "include" : "same-origin";
