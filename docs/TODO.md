# TODO – NextStep Rent‑a‑Car UI

This document tracks unfinished features and improvements. Items are grouped by feature area and prioritized roughly top‑to‑bottom within each section. Finished work is listed at the end.

## Authentication & Authorization
- Add login page (JWT) and store tokens securely (memory + refresh, or localStorage with care)
- Inject Authorization header via openapi-fetch middleware when logged in
- Protect routes using a guard; hide navigation and actions the user's role can't use (e.g. Settings for non-admins)
- Persist minimal user profile and roles; logout flow
- Until then the UI only works with the backend's open `local`/`docker` security; with `dev`/`prod` most calls return 403
- Tests: protected route behavior, token refresh handling (if implemented)

## Reservations
- Reservation details page for `/reservations/:id` (currently a placeholder; details open in a dialog on the Reservations page) and link to it from car cards ("Next booking")
- Edit the car or pick-up branch of a pending reservation (the backend allows changing the car; the edit dialog doesn't)
- Pricing for late and early returns (the backend keeps the booked price)
- Damage and fuel notes at return
- No-shows: confirmed reservations past their end date stay CONFIRMED until cancelled; consider expiring them
- "Overdue returns" filter on the Reservations list
- Fix the failing test "BookingReview > submits booking with correct data" (pre-existing)

## Cars
- Show the full booking schedule (only the current or next booking is shown today)
- Pick up directly from car details or availability results
- Image handling (placeholder now) – static asset or CDN strategy
- Tests for list filtering logic (maintain page reset on filter changes)

## Maintenance
- Assign jobs to staff (needs login; the API returns an assigned employee when set)
- Total maintenance cost per car and fleet reports
- Searchable car picker when scheduling from the overview (plain dropdown of up to 200 cars now)
- Sortable job table columns
- Overview counts use five small list requests; a summary endpoint would replace them
- MSW mock for "due for service" returns an empty list

## Branches
- Branch details page (optional) with address map embedding later
- Create/edit branches in the UI (API exists, ADMIN only)

## API & Data Layer
- Unify error handling in src/lib/api/queries.ts: older calls throw a normalized message (`normalizeError`), newer ones throw `{ status, ...problemDetail }` so the backend's reason can be shown
- Keep using the local-date helpers in src/lib/dates.ts; never derive "today" from `toISOString()` (UTC)

## UI/UX & Theming
- Add dark mode toggle and persist preference
- Refine component library coverage (e.g., date picker, pagination component)
- Extract reusable filter controls used by Availability and Cars
- Accessibility pass on forms and tables; focus management

## DevEx
- Add a `lint` script (eslint.config.js exists but isn't wired to a script) and Prettier if desired; CI script for lint
- Document coding conventions and file naming
- Pre‑commit hooks (lint-staged, typecheck)
- Add basic Playwright smoke tests (optional)

## Known gaps
- No auth yet – API endpoints that require roles fail until implemented
- Car images are placeholders; performance/image loading strategy TBD

## Done
- Customers: list with search and pagination, create/edit dialog with React Hook Form + Zod
- Booking: "Book" from availability results and car details, wizard (customer, dates, branch, price preview), confirmation screen
- Reservations: list with status/date filters and search, confirm, cancel, edit (PENDING), pick-up and return with odometer, overdue return badge
- Car details page with specifications, next booking, maintenance history and booking card
- Car catalog search; current or next booking on each car
- Maintenance overview and details pages (schedule, edit, start, complete, cancel, due for service, recalls)
- Settings page (mileage unit)
- API & data layer: reservation endpoints, error normalization, global error boundary and retry policies, MSW handlers and fixtures
- Example env files (.env.example, .env.test)
