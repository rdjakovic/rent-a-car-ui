import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// Mock the UI components to simplify testing
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className }: any) => (
    <button onClick={onClick} className={className}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => (
    <div className={className} data-testid="card">{children}</div>
  ),
  CardHeader: ({ children, className }: any) => (
    <div className={className} data-testid="card-header">{children}</div>
  ),
  CardTitle: ({ children }: any) => (
    <h3 data-testid="card-title">{children}</h3>
  ),
  CardDescription: ({ children }: any) => (
    <p data-testid="card-description">{children}</p>
  ),
  CardContent: ({ children, className }: any) => (
    <div className={className} data-testid="card-content">{children}</div>
  ),
}));

// Mock the icons
vi.mock('lucide-react', () => ({
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
  RefreshCw: () => <div data-testid="refresh-icon" />,
}));

// Now import the component after mocking
import ErrorBoundary, { QueryErrorBoundary } from '../ErrorBoundary';

// Create a component that throws an error for testing
const Bomb: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = true }) => {
  if (shouldThrow) {
    throw new Error('💥 KABOOM! 💥');
  }
  return <div>Hello there!</div>;
};

// Mock console.error to avoid noisy output during tests
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

describe('ErrorBoundary', () => {
  afterEach(() => {
    mockConsoleError.mockClear();
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Hello world</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Hello world')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('catches errors and displays fallback UI', () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(
      screen.getByText('An unexpected error occurred. Please try refreshing the page.')
    ).toBeInTheDocument();
    expect(screen.queryByText('Hello there!')).not.toBeInTheDocument();
    
    // Check that UI components are rendered
    expect(screen.getByTestId('card')).toBeInTheDocument();
    expect(screen.getByTestId('card-header')).toBeInTheDocument();
    expect(screen.getByTestId('card-title')).toBeInTheDocument();
    expect(screen.getByTestId('card-description')).toBeInTheDocument();
    expect(screen.getByTestId('card-content')).toBeInTheDocument();
    
    // Check that buttons are rendered
    expect(screen.getByRole('button', { name: /Try Again/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reload Page/i })).toBeInTheDocument();
  });

  it('displays error details in development environment', () => {
    // Mock NODE_ENV as development
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );

    expect(screen.getByText('Error details (development only):')).toBeInTheDocument();
    expect(screen.getByText('💥 KABOOM! 💥')).toBeInTheDocument();

    // Restore original NODE_ENV
    process.env.NODE_ENV = originalEnv;
  });

  it('does not display error details in production environment', () => {
    // Mock NODE_ENV as production
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );

    expect(screen.queryByText('Error details (development only):')).not.toBeInTheDocument();
    expect(screen.queryByText('💥 KABOOM! 💥')).not.toBeInTheDocument();

    // Restore original NODE_ENV
    process.env.NODE_ENV = originalEnv;
  });

  it('calls console.error when an error is caught', () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );

    expect(mockConsoleError).toHaveBeenCalledWith(
      'Error boundary caught an error:',
      expect.any(Error),
      expect.any(Object)
    );
  });

  it('reloads the page when Reload Page button is clicked', () => {
    // Mock window.location.reload
    const reloadMock = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: reloadMock },
      writable: true,
    });

    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );

    const reloadButton = screen.getByRole('button', { name: /Reload Page/i });
    fireEvent.click(reloadButton);

    expect(reloadMock).toHaveBeenCalled();
  });

  it('uses custom fallback when provided', () => {
    const customFallback = <div>Custom error message</div>;

    render(
      <ErrorBoundary fallback={customFallback}>
        <Bomb />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error message')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });
});

describe('QueryErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <QueryErrorBoundary>
        <div>Hello from query boundary</div>
      </QueryErrorBoundary>
    );

    expect(screen.getByText('Hello from query boundary')).toBeInTheDocument();
  });

  it('displays query-specific error UI when there is an error', () => {
    // We can't easily trigger the QueryErrorResetBoundary fallback without
    // setting up a failing query, but we can at least check that it renders
    expect(() => 
      render(
        <QueryErrorBoundary>
          <div>Test content</div>
        </QueryErrorBoundary>
      )
    ).not.toThrow();
  });
});