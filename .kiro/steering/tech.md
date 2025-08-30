# Technology Stack

## Frontend Stack
- **React 19** with **TypeScript** - Modern React with latest features
- **Vite 7** - Fast build tool and dev server
- **React Router 7** - Client-side routing
- **TanStack Query 5** - Server state management and caching
- **Zustand** - Lightweight client state management
- **React Hook Form + Zod** - Form handling and validation

## UI & Styling
- **Tailwind CSS 3** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
- **shadcn/ui style** - Component library in `src/components/ui`
- **Lucide React** - Icon library
- **tailwindcss-animate** - Animation utilities

## API & Data
- **openapi-fetch** - Type-safe API client
- **openapi-typescript** - Generate TypeScript types from OpenAPI specs
- **MSW (Mock Service Worker)** - API mocking for development/testing

## Testing
- **Vitest** - Fast unit test runner
- **Testing Library** - React component testing utilities
- **jsdom** - DOM environment for testing

## Development Tools
- **ESLint** - Code linting
- **PostCSS + Autoprefixer** - CSS processing
- **TypeScript 5.8** - Type checking

## Common Commands

### Development
```bash
npm run dev          # Start development server (http://localhost:3000)
npm run build        # Build for production
npm run preview      # Preview production build
```

### Testing
```bash
npm test            # Run tests in CLI mode
npm run test:ui     # Run tests with UI interface
```

### API Integration
```bash
npm run api:gen     # Generate TypeScript types from backend OpenAPI
npm run msw:init    # Initialize MSW for API mocking
```

### Backend Integration
```bash
# Start backend (requires backend setup)
scripts/start-backend.ps1
```

## Environment Configuration
- **VITE_API_BASE_URL** - Backend API base URL (required)
- Create `.env.local` file with: `VITE_API_BASE_URL=http://localhost:8080`

## Path Aliases
- `@/*` resolves to `src/*` (configured in vite.config.ts and tsconfig.json)

## Backend Dependencies
- **Spring Boot 3.5.5** with **Java 21**
- Backend serves OpenAPI docs at `/api-docs`
- Swagger UI available at `/swagger-ui.html`