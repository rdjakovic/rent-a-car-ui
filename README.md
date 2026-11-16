## NextStep Rent‑a‑Car UI

A React frontend for the Rent‑a‑Car API (Spring Boot 4.1, Java 25). It covers availability search and booking, the car catalog, customers, reservations with pick-up and return, fleet maintenance and application settings.

For backend details, see the backend README (rent-a-car-be) and docs/BACKEND.md.

### Tech stack
- React 19 + Vite 7 + TypeScript
- React Router 7 for routing
- TanStack Query 5 for server state and caching
- Tailwind CSS 3 with a small shadcn-style component library (src/components/ui)
- Radix UI primitives and lucide-react icons
- openapi-fetch + generated types via openapi-typescript
- Zustand (light client state), React Hook Form + Zod
- Vitest + Testing Library (unit/integration), MSW for API mocks

## Features
- **Sign-in** (`/login`): username or email (any letter case) and password. Every page needs a signed-in user: without a session you land on the login page and come back to the page you asked for after signing in. The header shows an initials button with name, role and branch and **Log out** (inside the hamburger menu on small screens). A session lasts 12 hours; the short-lived access token behind it is renewed automatically, also after a reload. Logging out clears the cached data and saved filters. **Change password** in the account menu needs the current password and ends the user's other sessions
- **Roles and permissions**: the backend sends the signed-in user's permissions and the UI shows only what they allow. Staff handle customers, reservations and maintenance scheduling; managers also add cars, run maintenance jobs and create staff accounts; administrators also change branches and settings and manage users. Actions that would be refused are hidden (Add car, New/Edit branch, Save settings, the manager-only maintenance actions), the Users page is behind a permission guard, and the backend still enforces every rule
- **Navigation**: one header on every page (once signed in). The seven links — plus **Users** for managers and administrators — sit in a row from 1280px wide; below that they move behind a hamburger menu
- **Availability search** (`/`): branch (active branches only), dates, category, transmission, fuel, seats, max price; "Book" starts the booking wizard. Same-day rentals are allowed (charged as one day). The start date is pre-selected as today. The branch is pre-selected from the signed-in user's own branch when it is open, then from the branch chosen in Settings. Reset clears the search and brings both defaults back
- **Booking wizard** (`/book`): choose or create a customer, review the price, confirm; cached availability and car lists refresh after booking. The link's parameters are checked in one place (`validateBookingParams`) and a problem is explained ("Start date cannot be in the past")
- **Branches** (`/branches`): search by name and city (partial, case-insensitive), **New branch** and **Edit** (name, address, city, country, phone, email, opening hours, **Active**). An inactive branch is closed: its cars aren't offered for booking and it can't be a pick-up or return location. Both actions are shown to administrators only
- **Car catalog** (`/cars`): free-text search (make, model or "2023 Toyota Camry") plus separate Make, Model, Year and VIN filters (year and VIN apply once complete: 4 digits, 17 characters) and the category, transmission, fuel, seats and price filters. **Add car** (managers and administrators) opens a form (VIN, make, model, year, category, transmission, fuel, seats, mileage, daily price, branch, status Available or Out of service, color, plate, insurance) and optional photos: up to 5, 5 MB each, JPEG/PNG/WebP, with previews and removal before saving. Each card shows the car's first photo as its cover (or a placeholder), its status and its current or next booking ("Next booking: Nov 20 – 22", "Booked today", "On rent until …"), linked to the reservation
- **Edit car** (from the details page, managers and administrators) opens the same form prefilled, including the car's current photos; photos can be removed and new ones added, up to the 5-photo limit. **Car details** (`/cars/:id`): a gallery of all uploaded photos (main image and thumbnails; a placeholder when there are none), specifications, registration and service dates, pick-up branch, next booking, maintenance history (with "Schedule maintenance", for every signed-in user), and a booking card that checks availability for chosen dates
- **Customers** (`/customers`): search, create and edit
- **Reservations** (`/reservations`):
  - Filter by status (Pending, Confirmed, Active, Cancelled, Completed), dates and search; **Reservation #** looks one up by number (it works for single digits, which the 2-character search can't); **New Reservation** goes to the availability search
  - **View** opens the reservation page (`/reservations/:id`) with all actions
  - Confirm and cancel; edit dates, return location and notes while PENDING
  - **Pick up** (confirmed reservations within their dates) and **Return** (active rentals), both recording the odometer
  - "Overdue return" badge for rentals past their end date
- **Maintenance** (`/maintenance`, `/maintenance/:id`):
  - Overview: in progress, overdue, due in 7 days, open recalls (click to filter), cars due for service with one-click scheduling, and a filterable job list. Everyone signed in can see jobs and schedule one
  - Details: start, edit, complete (final cost, odometer, next service date, notes) and cancel; safety recall warning. These actions are for managers and administrators; staff see the job and its history read-only
  - Scheduling is refused on days the car is booked, and scheduled jobs block bookings on their date
- **Settings** (`/settings`): mileage unit (km or mi), used wherever mileage is shown, and the default branch (an open branch or none) that the Availability page pre-selects. Everyone can read the page; only administrators see **Save**
- **Users** (`/users`): managers and administrators see the accounts with search, role filter and pagination. Managers can create **staff** accounts (username, email, initial password, name, phone and branch); administrators can also edit role, branch and details, disable or enable an account, and reset a password. Disabling ends that user's sessions at once. A branch can be changed but not removed, so an account that has one doesn't offer "No branch". Accounts without a role (e.g. former customers) are enabled through the edit dialog. The page is behind a permission guard, and an administrator can't disable, demote or reset the password of their own account (own password: Change password in the account menu)
- **Saved filters**: Availability, Cars, Customers and Reservations keep their filters and page while you move between pages (in memory, so a reload starts fresh). A saved branch that has since been closed is dropped, and saved dates that have passed are replaced (the start date goes back to today)
- **Responsive**: no horizontal page overflow from 360px wide up; wide tables scroll inside their card
- Global toast system and Tailwind‑based theme with brand palette

## Getting started
### Prerequisites
- Node.js 20+ and pnpm
- A running backend, e.g. `./mvnw spring-boot:run -Dspring-boot.run.profiles=docker` (PostgreSQL in Docker) or the default `local` profile (H2)

### 1) Configure environment
Nothing is needed for a backend on http://localhost:8080: `pnpm dev` (and `pnpm preview`) forward `/api` to it, so the browser only talks to http://localhost:3000. One origin means no CORS and a first-party login cookie (the proxy also drops the `Origin` header that browsers add to same-origin POSTs, which the backend would otherwise take for a cross-origin call). To use a backend elsewhere, set `API_PROXY_TARGET` (e.g. `API_PROXY_TARGET=http://localhost:8081 pnpm dev`).

Leave `VITE_API_BASE_URL` empty (or unset). Set it only to call an API on another host directly; the backend must then allow that origin (CORS). In production, serve the app and the API behind one host.

Set `VITE_ENABLE_MOCKING=true` to run against MSW mocks instead of a backend (see src/lib/mocks; the mocks are simplified, e.g. no availability or date checks).

### 2) Install and run
```
pnpm install
pnpm dev
```

The app runs at http://localhost:3000 by default.

pnpm 12.11.2 is pinned in package.json (`packageManager`). pnpm-workspace.yaml sets `nodeLinker: hoisted` (a flat, npm-style `node_modules`), because some Windows builds block pnpm's symlinked one ("untrusted mount point", os error 448), and allows the esbuild and msw build scripts.

Tip: You can start the backend from PowerShell via scripts/start-backend.ps1 (edit path if needed).

## Scripts
- `pnpm dev` – start Vite dev server
- `pnpm build` – typecheck and build for production
- `pnpm preview` – preview built app
- `pnpm test` – run all tests once (suitable for CI)
- `pnpm test:watch` – vitest in watch mode
- `pnpm test:coverage` – tests with a coverage summary (written to `coverage/`, which is git-ignored)
- `pnpm coverage:html` – coverage as an HTML report
- `pnpm test:ui` – run vitest UI
- `pnpm api:gen` – generate TypeScript types from the backend OpenAPI docs (backend running at http://localhost:8080/api-docs)

## API typing and client
This project uses openapi-typescript to generate types into src/lib/api/schema.d.ts and openapi-fetch for a typed API client:
- src/lib/api/client.ts configures baseUrl from VITE_API_BASE_URL (empty by default: relative `/api/...` URLs through the dev proxy)
- src/lib/api/queries.ts contains domain‑specific query functions used by pages
- All backend paths are under `/api/v1`
- Every call goes through `request()`, which throws an `ApiError` (a real `Error`) for any non-2xx response, including a 403 without a body, and for network failures. Its `message` is the backend's reason (e.g. "Car is not available for the selected dates") or a friendly text; show it with `errorMessage(error)` from `src/lib/api/errors.ts`

To regenerate types after backend changes:
1) Start the backend locally (serving /api-docs)
2) Run `pnpm api:gen`

## Project structure
- src/main.tsx – app bootstrap, QueryClient, BrowserRouter
- src/App.tsx – routes and header navigation
- src/features/* – feature pages: availability, branches, cars, customers, reservations (incl. BookingFlow), maintenance, settings, users
- src/components – NavigationBar and ErrorBoundary; src/components/ui holds small, reusable UI primitives
- src/hooks – shared hooks (e.g. useSettings, useBookingFlow, useResetPageOnChange)
- src/lib/api – openapi client, generated schema, and query wrappers
- src/lib/dates.ts – local-date helpers (`todayString`, `daysFromToday`); use them instead of `toISOString()`, which gives the UTC date
- src/lib/units.ts – mileage formatting with the configured unit
- src/lib/mocks – MSW handlers and data
- src/lib/auth – sign-in session: `authStore.ts` (status, access token in memory, user; `useCan(permission)` for components), `session.ts` (login, logout, refresh; `authFetch` adds the token and renews it once after a 401; refreshes take turns across tabs and share one request within a tab), `permissions.ts` (the permission names the backend sends). src/features/auth – `LoginPage`, `RequireAuth` (sign-in guard), `RequirePermission` (permission guard), `ChangePasswordPage`. src/test/authUsers.ts – `signInAs('STAFF' | 'MANAGER' | 'ADMIN')` for role-gated tests
- src/stores – Zustand stores: `filterStore.ts` (each list page's saved filters; use `useFilterField` like `useState`), `useBookingFlowStore`, and `bookingParams.ts` (validation of the booking link)
- src/index.css + tailwind.config.js – theme and brand colors

Path alias: @ resolves to src/ (see vite.config.ts).

## Routing
- `/login` – LoginPage (the only page without a sign-in)
- `/` – AvailabilityPage
- `/book` – BookingWizard
- `/branches` – BranchesPage
- `/cars`, `/cars/:id` – CarsPage, CarDetailsPage
- `/customers` – CustomersPage
- `/reservations`, `/reservations/:id` – ReservationsPage, ReservationDetailsPage
- `/maintenance`, `/maintenance/:id` – MaintenancePage, MaintenanceDetailsPage
- `/settings` – SettingsPage
- `/users` – UsersPage (managers and administrators)
- `/change-password` – ChangePasswordPage

## Theming & UI
- Tailwind configured with brand colors: navy, steel, emerald, orange, silver, light, charcoal
- CSS variables define light/dark tokens; Tailwind maps them to shadcn‑style tokens (background, primary, etc.)
- Reusable components in src/components/ui (button, card, table, select, toast, etc.)

## Data fetching
- TanStack Query provides caching, loading states, and pagination helpers
- All network calls go through openapi-fetch with types from schema.d.ts
- Extend src/lib/api/queries.ts with new endpoint wrappers when needed
- After a change, invalidate the queries it affects (e.g. a booking invalidates `available-cars`, `cars`, `car` and `reservations`)

## Testing
- Vitest + jsdom + @testing-library/react configured in vite.config.ts
- Setup file: src/setupTests.ts
- Run: `pnpm test` (once), `pnpm test:watch`, `pnpm test:coverage`
- Tests are self-contained: each file mocks what it needs and has its own small render helper (no shared factories or scenario builders; an earlier branch had ~1,850 lines of them for five tests, and they weren't needed). The one shared helper is `src/test/authUsers.ts` (`signInAs('MANAGER')`), so every role-gated test starts from the same permission set. Tests don't depend on each other: the suite passes with shuffled order (`pnpm exec vitest run --sequence.shuffle.tests`). Saved page filters are reset after every test (setupTests)
- Build test dates with `daysFromToday()` from `src/lib/dates.ts`, never `toISOString()` (UTC): tests built that way failed between local midnight and 02:00

## Development notes
- API calls go through the Vite proxy (`/api` → `API_PROXY_TARGET`, default http://localhost:8080); `VITE_API_BASE_URL` is only for an API on another host
- Tests use `VITE_API_BASE_URL=http://localhost:3000` (set in vite.config.ts), because Node's fetch needs absolute URLs
- Backend dev URLs:
  - App: http://localhost:8080
  - Swagger UI: http://localhost:8080/swagger-ui.html
  - API docs (OpenAPI): http://localhost:8080/api-docs
- Path alias @ for imports

## Roadmap (high level)
- Pricing for late and early returns; damage/fuel notes at return
- Limit staff to their own branch; record who made each change
- Broader test coverage
