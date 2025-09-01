import createClient from "openapi-fetch";
import type { paths } from "./schema";

// In test environment, use a proper base URL that MSW can intercept
// In production/development, use the environment variable or default to localhost
const isTest = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';
const baseUrl = isTest ? "http://localhost:8080" : (import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:8080";

export const api = createClient<paths>({ baseUrl });
