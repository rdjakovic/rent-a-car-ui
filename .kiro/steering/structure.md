# Project Structure

## Root Directory
```
├── src/                    # Source code
├── public/                 # Static assets (logo.svg, vite.svg)
├── docs/                   # Documentation
├── scripts/                # Build and utility scripts
├── .kiro/                  # Kiro configuration and steering
├── .env.local              # Environment variables (not in git)
├── package.json            # Dependencies and scripts
└── vite.config.ts          # Vite configuration
```

## Source Code Organization (`src/`)

### Core Application
- `main.tsx` - Application bootstrap with providers
- `App.tsx` - Main routing and navigation
- `index.css` - Global styles and CSS variables
- `setupTests.ts` - Test configuration

### Feature-Based Architecture (`src/features/`)
Each feature has its own directory with components, hooks, and utilities:
```
features/
├── availability/           # Car availability search
├── branches/              # Branch management
├── cars/                  # Car catalog
├── customers/             # Customer management
└── reservations/          # Booking and reservations
    ├── BookingFlow/       # Multi-step booking wizard
    ├── utils/             # Feature-specific utilities
    └── __tests__/         # Feature tests
```

### Shared Components (`src/components/`)
- `ui/` - Reusable UI primitives (shadcn/ui style)
- `ErrorBoundary.tsx` - Global error handling

### State Management (`src/stores/`)
- Zustand stores for client state
- Each store has corresponding test files in `__tests__/`

### Custom Hooks (`src/hooks/`)
- Reusable React hooks
- Test files in `__tests__/` directory

### Utilities (`src/lib/`)
```
lib/
├── api/                   # API client and queries
│   ├── client.ts         # openapi-fetch configuration
│   ├── queries.ts        # TanStack Query wrappers
│   └── schema.d.ts       # Generated TypeScript types
├── mocks/                # MSW mock handlers
├── query/                # TanStack Query configuration
└── utils.ts              # General utilities
```

## Naming Conventions

### Files and Directories
- **PascalCase** for React components (`BookingWizard.tsx`)
- **camelCase** for utilities and hooks (`useBookingFlow.ts`)
- **kebab-case** for non-component files when appropriate
- **__tests__** directories for test files

### Components
- Component files match component name exactly
- Index files for barrel exports when needed
- Feature components grouped in feature directories

### API and Types
- Generated types in `schema.d.ts` (auto-generated, don't edit)
- API queries in `queries.ts` with descriptive names
- Environment variables prefixed with `VITE_`

## Import Patterns
- Use `@/` path alias for all src imports
- Relative imports only within the same feature directory
- Import UI components from `@/components/ui`
- Import API functions from `@/lib/api`

## Testing Structure
- Test files co-located with source in `__tests__/` directories
- Unit tests for hooks, stores, and utilities
- Integration tests for complex components
- MSW for API mocking in tests

## Configuration Files
- `tailwind.config.js` - Tailwind CSS and brand colors
- `tsconfig.json` - TypeScript configuration with path mapping
- `vite.config.ts` - Vite build configuration and test setup
- `eslint.config.js` - Code linting rules