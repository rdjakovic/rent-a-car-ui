# TODO – NextStep Rent‑a‑Car UI

This document tracks unfinished features and improvements. Items are grouped by feature area and prioritized roughly top‑to‑bottom within each section.

## Customers
- Build Customers list page with search and pagination (uses GET /api/customers)
- Customer details view
- Create/Edit customer form using React Hook Form + Zod schema (POST/PUT /api/customers)
- Client‑side validation (name, email, phone, driver license)
- Success/error toasts and optimistic UI where sensible
- Tests: form validation, happy path create/update, error handling

## Reservations (Booking)
- From Availability results, implement Book action to start reservation flow
- Wizard or single page to collect: customer, pickup/return dates, branch (pre‑filled), selected car
- Price preview based on backend rules (dailyPrice × days)
- Create reservation request to backend (endpoint TBD)
- Post‑booking confirmation screen with reservation number
- Tests: availability → booking e2e at page/component level with msw

## Cars
- Car details page with richer info and recent reservations/maintenance snippets
- Image handling (placeholder now) – static asset or CDN strategy
- Improved loading skeletons and error states
- Tests for list filtering logic (maintain page reset on filter changes)

## Branches
- Branch details page (optional) with address map embedding later

## Authentication & Authorization
- Add login page (JWT) and store tokens securely (memory + refresh, or localStorage with care)
- Inject Authorization header via openapi-fetch interceptors when logged in
- Protect routes using a guard/HOC; hide navigation for unauthorized roles
- Persist minimal user profile and roles; logout flow
- Tests: protected route behavior, token refresh handling (if implemented)

## API & Data Layer
- Extend src/lib/api/queries.ts with reservation endpoints (create, list, details)
- Consider error normalization utility for consistent messages
- Add global query error boundary/toast and retry policies per endpoint
- Add MSW handlers and seed fixtures for offline/dev testing

## UI/UX & Theming
- Add dark mode toggle and persist preference
- Refine component library coverage (e.g., date picker, pagination component)
- Extract reusable filter controls used by Availability and Cars
- Accessibility pass on forms and tables; focus management

## DevEx
- Add ESLint/Prettier configs (if desired) and CI script for lint
- Document coding conventions and file naming
- Pre‑commit hooks (lint-staged, typecheck)
- Add basic Playwright smoke tests (optional)

## Configuration
- Make VITE_API_BASE_URL configurable per environment with example .env files
- Document scripts/start-backend.ps1 usage and repo path override

## Known gaps
- Routes /customers, /reservations, /maintenance are placeholders
- No auth yet – API endpoints that require roles will fail until implemented
- Car images are placeholders; performance/image loading strategy TBD

