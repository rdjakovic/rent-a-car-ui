## NextStep Rent‑a‑Car UI

A modern React frontend for the Rent‑a‑Car API (Spring Boot 3.5.5, Java 21). It provides availability search, branch listing, and a car catalog, with room for customer, reservation, and maintenance features.

For backend details, see docs/BACKEND.md.

### Tech stack
- React 19 + Vite 7 + TypeScript
- React Router 7 for routing
- TanStack Query 5 for server state and caching
- Tailwind CSS 3 with a small shadcn-style component library (src/components/ui)
- Radix UI primitives and lucide-react icons
- openapi-fetch + generated types via openapi-typescript
- Zustand (light client state), React Hook Form + Zod (installed, to be used more broadly)
- Vitest + Testing Library (unit/integration)

## Features
- Availability search (home route /)
  - Filters: branch, dates, category, transmission, fuel, min seats, max daily price
  - Paginated results from GET /api/cars/available
- Branches list (/branches)
  - Paginated table of branches from GET /api/branches
- Car catalog (/cars)
  - Free‑text search and filters, paginated cards from GET /api/cars
- Global toast system and Tailwind‑based theme with brand palette

Planned/placeholder routes:
- /customers, /reservations, /maintenance (not yet implemented in UI)

## Getting started
### Prerequisites
- Node.js 20+ and npm 10+
- A running backend (see docs/BACKEND.md for profiles and commands)

### 1) Configure environment
Create a .env.local file in the project root with the API base URL:

VITE_API_BASE_URL=http://localhost:8080

### 2) Install and run
- npm install
- npm run dev

The app runs at http://localhost:3000 by default.

Tip: You can start the backend from PowerShell via scripts/start-backend.ps1 (edit path if needed).

## NPM scripts
- dev – start Vite dev server
- build – typecheck and build for production
- preview – preview built app
- test – run vitest in CLI
- test:ui – run vitest UI
- api:gen – generate TypeScript types from backend OpenAPI (requires backend running at /api-docs)

## API typing and client
This project uses openapi-typescript to generate types into src/lib/api/schema.d.ts and openapi-fetch for a typed API client:
- src/lib/api/client.ts configures baseUrl from VITE_API_BASE_URL
- src/lib/api/queries.ts contains domain‑specific query functions used by pages

To regenerate types after backend changes:
1) Start the backend locally (serving /api-docs)
2) Run npm run api:gen

## Project structure
- src/main.tsx – app bootstrap, QueryClient, BrowserRouter
- src/App.tsx – routes and header navigation
- src/features/* – feature pages (availability, branches, cars)
- src/components/ui – small, reusable UI primitives
- src/lib/api – openapi client, generated schema, and query wrappers
- src/stores – Zustand stores (e.g., useSearchStore)
- src/index.css + tailwind.config.js – theme and brand colors

Path alias: @ resolves to src/ (see vite.config.ts).

## Routing
- / – AvailabilityPage: builds parameters and requests available cars; shows results table with pagination
- /branches – BranchesPage: paginated branches table
- /cars – CarsPage: card grid with search and filter controls, pagination
- /customers, /reservations, /maintenance – placeholders for upcoming features

## Theming & UI
- Tailwind configured with brand colors: navy, steel, emerald, orange, silver, light, charcoal
- CSS variables define light/dark tokens; Tailwind maps them to shadcn‑style tokens (background, primary, etc.)
- Reusable components in src/components/ui (button, card, table, select, toast, etc.)

## Data fetching
- TanStack Query provides caching, loading states, and pagination helpers
- All network calls go through openapi-fetch with types from schema.d.ts
- Extend src/lib/api/queries.ts with new endpoint wrappers when needed

## Testing
- Vitest + jsdom + @testing-library/react configured in vite.config.ts
- Setup file: src/setupTests.ts
- Run: npm test (or npm run test:ui)

## Development notes
- Env var VITE_API_BASE_URL is required for API calls
- Backend dev URLs (when using local profile):
  - App: http://localhost:8080
  - Swagger UI: http://localhost:8080/swagger-ui.html
  - API docs (OpenAPI): http://localhost:8080/api-docs
- Path alias @ for imports

## Roadmap (high level)
See docs/TODO.md for detailed tasks. Highlights:
- Implement Customers UI with CRUD and RHF+Zod validation
- Booking flow from availability results (Book button)
- Car detail page and booking handoff (View Details)
- Authentication (JWT login, token storage, auth guard)
- Reservations and Maintenance feature UIs
- API error handling patterns and global error boundary
- MSW fixtures and broader test coverage
