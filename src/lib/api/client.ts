import createClient from "openapi-fetch";
import type { paths } from "./schema";

// Fallback to relative paths in tests/dev if env var is not set
const baseUrl = (import.meta.env.VITE_API_BASE_URL as string) || "";
export const api = createClient<paths>({ baseUrl });
