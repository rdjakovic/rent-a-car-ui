import createClient from "openapi-fetch";
import type { paths } from "./schema";
import { baseUrl, credentials } from "./base";
import { authFetch } from "@/lib/auth/session";

/** The API client: every call carries the access token and renews it once after a 401 (see authFetch). */
export const api = createClient<paths>({ baseUrl, credentials, fetch: authFetch });
