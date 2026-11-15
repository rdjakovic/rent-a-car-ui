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
- **Navigation**: one header on every page. The seven links sit in a row from 1280px wide; below that they move behind a hamburger menu
- **Availability search** (`/`): branch (active branches only), dates, category, transmission, fuel, seats, max price; "Book" starts the booking wizard. Same-day rentals are allowed (charged as one day). Reset clears the whole search
- **Booking wizard** (`/book`): choose or create a customer, review the price, confirm; cached availability and car lists refresh after booking. The link's parameters are checked in one place (`validateBookingParams`) and a problem is explained ("Start date cannot be in the past")
- **Branches** (`/branches`): search by name and city (partial, case-insensitive), **New branch** and **Edit** (name, address, city, country, phone, email, opening hours, **Active**). An inactive branch is closed: its cars aren't offered for booking and it can't be a pick-up or return location. Changing branches needs ADMIN with the real backend security
- **Car catalog** (`/cars`): free-text search (make, model or "2023 Toyota Camry") plus separate Make, Model, Year and VIN filters (year and VIN apply once complete: 4 digits, 17 characters) and the category, transmission, fuel, seats and price filters. **Add car** opens a form (VIN, make, model, year, category, transmission, fuel, seats, mileage, daily price, branch, status Available or Out of service, color, plate, insurance). Each card shows the car's status and its current or next booking ("Next booking: Nov 20 – 22", "Booked today", "On rent until …"), linked to the reservation
- **Car details** (`/cars/:id`): specifications, registration and service dates, pick-up branch, next booking, maintenance history (with "Schedule maintenance"), and a booking card that checks availability for chosen dates
- **Customers** (`/customers`): search, create and edit
- **Reservations** (`/reservations`):
  - Filter by status (Pending, Confirmed, Active, Cancelled, Completed), dates and search; **Reservation #** looks one up by number (it works for single digits, which the 2-character search can't); **New Reservation** goes to the availability search
  - **View** opens the reservation page (`/reservations/:id`) with all actions
  - Confirm and cancel; edit dates, return location and notes while PENDING
  - **Pick up** (confirmed reservations within their dates) and **Return** (active rentals), both recording the odometer
  - "Overdue return" badge for rentals past their end date
- **Maintenance** (`/maintenance`, `/maintenance/:id`):
  - Overview: in progress, overdue, due in 7 days, open recalls (click to filter), cars due for service with one-click scheduling, and a filterable job list
  - Details: start, edit, complete (final cost, odometer, next service date, notes) and cancel; safety recall warning
  - Scheduling is refused on days the car is booked, and scheduled jobs block bookings on their date
- **Settings** (`/settings`): mileage unit (km or mi), used wherever mileage is shown. Changing it needs ADMIN with the real backend security; the `local` and `docker` backend profiles allow everyone
- **Saved filters**: Availability, Cars, Customers and Reservations keep their filters and page while you move between pages (in memory, so a reload starts fresh). A saved branch that has since been closed, or saved dates that have passed, are dropped
- **Responsive**: no horizontal page overflow from 360px wide up; wide tables scroll inside their card
- Global toast system and Tailwind‑based theme with brand palette

Not implemented yet: login (the UI relies on the backend's open `local`/`docker` security).

## Getting started
### Prerequisites
- Node.js 20+ and pnpm
- A running backend, e.g. `./mvnw spring-boot:run -Dspring-boot.run.profiles=docker` (PostgreSQL in Docker) or the default `local` profile (H2)

### 1) Configure environment
Create a .env.local file in the project root with the API base URL:

```
VITE_API_BASE_URL=http://localhost:8080
```

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
- src/lib/api/client.ts configures baseUrl from VITE_API_BASE_URL
- src/lib/api/queries.ts contains domain‑specific query functions used by pages
- All backend paths are under `/api/v1`
- Every call goes through `request()`, which throws an `ApiError` (a real `Error`) for any non-2xx response, including a 403 without a body, and for network failures. Its `message` is the backend's reason (e.g. "Car is not available for the selected dates") or a friendly text; show it with `errorMessage(error)` from `src/lib/api/errors.ts`

To regenerate types after backend changes:
1) Start the backend locally (serving /api-docs)
2) Run `pnpm api:gen`

## Project structure
- src/main.tsx – app bootstrap, QueryClient, BrowserRouter
- src/App.tsx – routes and header navigation
- src/features/* – feature pages: availability, branches, cars, customers, reservations (incl. BookingFlow), maintenance, settings
- src/components – NavigationBar and ErrorBoundary; src/components/ui holds small, reusable UI primitives
- src/hooks – shared hooks (e.g. useSettings, useBookingFlow, useResetPageOnChange)
- src/lib/api – openapi client, generated schema, and query wrappers
- src/lib/dates.ts – local-date helpers (`todayString`, `daysFromToday`); use them instead of `toISOString()`, which gives the UTC date
- src/lib/units.ts – mileage formatting with the configured unit
- src/lib/mocks – MSW handlers and data
- src/stores – Zustand stores: `filterStore.ts` (each list page's saved filters; use `useFilterField` like `useState`), `useBookingFlowStore`, and `bookingParams.ts` (validation of the booking link)
- src/index.css + tailwind.config.js – theme and brand colors

Path alias: @ resolves to src/ (see vite.config.ts).

## Routing
- `/` – AvailabilityPage
- `/book` – BookingWizard
- `/branches` – BranchesPage
- `/cars`, `/cars/:id` – CarsPage, CarDetailsPage
- `/customers` – CustomersPage
- `/reservations`, `/reservations/:id` – ReservationsPage, ReservationDetailsPage
- `/maintenance`, `/maintenance/:id` – MaintenancePage, MaintenanceDetailsPage
- `/settings` – SettingsPage

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
- Saved page filters are reset after every test (setupTests), so tests don't leak into each other
- Build test dates with `daysFromToday()` from `src/lib/dates.ts`, never `toISOString()` (UTC): tests built that way failed between local midnight and 02:00

## Development notes
- Env var VITE_API_BASE_URL is required for API calls
- Backend dev URLs:
  - App: http://localhost:8080
  - Swagger UI: http://localhost:8080/swagger-ui.html
  - API docs (OpenAPI): http://localhost:8080/api-docs
- Path alias @ for imports

## Roadmap (high level)
- Authentication (JWT login, token storage, auth guard) so the UI works with the real backend security
- Pricing for late and early returns; damage/fuel notes at return
- Broader test coverage
