import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { createQueryClient } from '@/lib/query/config'
import ErrorBoundary, { QueryErrorBoundary } from '@/components/ErrorBoundary'
import { enableMocking } from '@/lib/mocks/browser'

const queryClient = createQueryClient()

// Enable MSW mocking in development if configured
enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <QueryErrorBoundary>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </QueryErrorBoundary>
        </QueryClientProvider>
      </ErrorBoundary>
    </StrictMode>,
  )
})
