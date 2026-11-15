# TODO – NextStep Rent‑a‑Car UI

This document tracks unfinished features and improvements. Items are grouped by feature area and prioritized roughly top‑to‑bottom within each section. Finished work is listed at the end.

## Authentication & Authorization
- Signing out in one tab doesn't sign out the others until their access token (15 minutes) runs out
- If the server can't be reached while the app starts, a "Try again" screen is shown (a signed-in user who loses the connection later just sees failing requests)
- Limit staff to their own branch: rights apply to all branches for now, though the user's `branchId` and `employees.branch_id` are already available
- Record who made each change (e.g. `created_by` on reservations and maintenance)
- Forgot-password by email (there is no mail setup); an administrator can reset a password today

## Reservations
- Edit the car or pick-up branch of a pending reservation (the backend allows changing the car; the edit dialog doesn't)
- Pricing for late and early returns (the backend keeps the booked price)
- Damage and fuel notes at return
- No-shows: confirmed reservations past their end date stay CONFIRMED until cancelled; consider expiring them
- "Overdue returns" filter on the Reservations list
- The row actions on the list (Confirm, Cancel) show a fixed "Failed to …" toast instead of the backend's reason (the dialogs show it)

## Cars
- Edit a car (price, status, out of service) and see deleted cars; the backend supports both, but the catalog only adds cars today
- Delete and restore cars (ADMIN in the API)
- Show the full booking schedule (only the current or next booking is shown today)
- Pick up directly from car details or availability results
- Search by part of a VIN (the backend matches the `vin` filter exactly and case-sensitively, so the page applies it at 17 characters; partial search needs a backend change)
- Image handling (placeholder now) – static asset or CDN strategy

## Maintenance
- Assign jobs to staff (the API returns an assigned employee when set; there is no UI to choose one)
- Total maintenance cost per car and fleet reports
- Searchable car picker when scheduling from the overview (plain dropdown of up to 200 cars now)
- Sortable job table columns
- Overview counts use five small list requests; a summary endpoint would replace them
- MSW mock for "due for service" returns an empty list

## Branches
- Branch details page (optional) with address map embedding later
- Delete a branch (the API can, but a branch with cars or reservations is refused by the database)

## API & Data Layer
- `features/reservations/utils/errorHandling.ts` still has its own `createApiError` for the booking flow; fold it into `ApiError` (src/lib/api/errors.ts)
- Failures are shown by the page and, for mutations, by a global toast too, so some show twice
- Keep using the local-date helpers in src/lib/dates.ts; never derive "today" from `toISOString()` (UTC)

## UI/UX & Theming
- Add dark mode toggle and persist preference
- Refine component library coverage (e.g., date picker, pagination component)
- Extract reusable filter controls used by Availability and Cars
- Saved filters live in memory; keep them across a reload (localStorage) if wanted, then stale dates and closed branches matter even more
- The header is 5px too wide on 320px screens (360px and up are fine)
- The search boxes apply their value after a 400 ms pause; "Clear" within that window lets a pending value come back
- Accessibility pass on forms and tables; focus management

## DevEx
- Add a `lint` script (eslint.config.js exists but isn't wired to a script) and Prettier if desired; CI script for lint
- Document coding conventions and file naming
- Pre‑commit hooks (lint-staged, typecheck)
- Browser mock mode (`VITE_ENABLE_MOCKING=true`) needs `public/mockServiceWorker.js`, which isn't in the repo (`pnpm msw:init` creates it); the unit tests don't need it
- 14 test files each define their own render-with-providers helper (QueryClient + router); a shared one would remove the copies, but they differ (MemoryRouter or BrowserRouter, toaster, extra providers), so it hasn't been worth the churn yet
- Add basic Playwright smoke tests (optional). Layout can't be checked in jsdom; overflow was verified in a real browser by hand

## Known gaps
- Car images are placeholders; performance/image loading strategy TBD

## Done
- Roles: actions hidden by permission (Add car, branch and settings changes, manager maintenance actions), permission-guarded routes, Users page (managers create staff; administrators manage accounts), Change password page, and the user's own branch pre-selected on Availability
- Customers: list with search and pagination, create/edit dialog with React Hook Form + Zod
- Booking: "Book" from availability results and car details, wizard (customer, dates, branch, price preview), confirmation screen; the link's parameters are validated in one place
- Reservations: list with status/date filters and search, lookup by reservation number, confirm, cancel, edit (PENDING), pick-up and return with odometer, overdue return badge, reservation page (`/reservations/:id`)
- Cars: details page (specifications, next booking, maintenance history, booking card), search, Make/Model/Year/VIN filters, Add car dialog, current or next booking on each card
- Branches: search by name and city, create and edit, Active status (inactive branches aren't bookable)
- Maintenance overview and details pages (schedule, edit, start, complete, cancel, due for service, recalls)
- Sign-in: login page, access token in memory and refresh cookie (renewed on a 401 and on reload), route guard, user menu with Log out; session data is cleared on sign-out
- Settings page (mileage unit, default branch); Availability pre-selects the default branch and today as the start date
- Navigation bar with a hamburger menu; no horizontal overflow from 360px up
- Saved filters on Availability, Cars, Customers and Reservations
- One error style for all API calls (`request()` / `ApiError`); global error boundary and retry policies
- Tests: single-run `pnpm test`, coverage scripts, MSW handlers and fixtures
- Example env files (.env.example, .env.test)
