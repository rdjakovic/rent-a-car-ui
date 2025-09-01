import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '@/lib/mocks/server';
import BranchesPage from '../BranchesPage';

// Mock the UI components to simplify testing
vi.mock('@/components/ui/table', () => ({
  Table: ({ children, className }: any) => (
    <table className={className} data-testid="table">
      {children}
    </table>
  ),
  TableBody: ({ children }: any) => <tbody>{children}</tbody>,
  TableCell: ({ children, className }: any) => (
    <td className={className}>{children}</td>
  ),
  TableHead: ({ children, className }: any) => (
    <th className={className}>{children}</th>
  ),
  TableHeader: ({ children }: any) => <thead>{children}</thead>,
  TableRow: ({ children, className }: any) => (
    <tr className={className}>{children}</tr>
  ),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => (
    <div className={className} data-testid="card">
      {children}
    </div>
  ),
  CardContent: ({ children, className }: any) => (
    <div className={className} data-testid="card-content">
      {children}
    </div>
  ),
  CardHeader: ({ children, className }: any) => (
    <div className={className} data-testid="card-header">
      {children}
    </div>
  ),
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: any) => (
    <span data-variant={variant}>{children}</span>
  ),
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: any) => (
    <div className={className} data-testid="skeleton" />
  ),
}));

// Use the global MSW server configured in src/setupTests.ts

// Set up react query client for testing
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

function renderWithClient(ui: React.ReactElement) {
  const testQueryClient = createTestQueryClient();
  const { rerender, ...result } = render(
    <QueryClientProvider client={testQueryClient}>{ui}</QueryClientProvider>
  );
  return {
    ...result,
    rerender: (rerenderUi: React.ReactElement) =>
      rerender(
        <QueryClientProvider client={testQueryClient}>
          {rerenderUi}
        </QueryClientProvider>
      ),
  };
}

describe('BranchesPage', () => {
  it('renders the page title correctly', async () => {
    // Mock successful response
    server.use(
      http.get('http://localhost:8080/api/branches', () => {
        return HttpResponse.json({
          content: [],
          number: 0,
          size: 10,
          totalElements: 0,
          totalPages: 0,
          first: true,
          last: true,
          empty: true,
          numberOfElements: 0,
        });
      })
    );

    renderWithClient(<BranchesPage />);

    expect(screen.getByText('Branches')).toBeInTheDocument();
    expect(screen.getByTestId('card')).toBeInTheDocument();
    expect(screen.getByTestId('card-header')).toBeInTheDocument();
    expect(screen.getByTestId('card-content')).toBeInTheDocument();
  });

  it('displays loading state while fetching data', async () => {
    // Delay the response to simulate loading state
    server.use(
      http.get('http://localhost:8080/api/branches', async () => {
        // Add a small delay to ensure loading state is visible
        await new Promise((resolve) => setTimeout(resolve, 100));
        return HttpResponse.json({
          content: [],
          number: 0,
          size: 10,
          totalElements: 0,
          totalPages: 0,
          first: true,
          last: true,
          empty: true,
          numberOfElements: 0,
        });
      })
    );

    renderWithClient(<BranchesPage />);

    // Should show loading state
    const skeletons = screen.queryAllByTestId('skeleton');
    expect(skeletons.length).toBeGreaterThan(0);

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryAllByTestId('skeleton')).toHaveLength(0);
    });
  });

  it('displays branch data in a table', async () => {
    renderWithClient(<BranchesPage />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryAllByTestId('skeleton')).toHaveLength(0);
    });

    // Check that the table is rendered
    expect(screen.getByTestId('table')).toBeInTheDocument();

    // Check table headers
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Address')).toBeInTheDocument();
    expect(screen.getByText('City')).toBeInTheDocument();
    expect(screen.getByText('Country')).toBeInTheDocument();
    expect(screen.getByText('Phone')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Hours')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();

    // Check that at least one branch is displayed (we know the real mock data has branches)
    expect(screen.getByText('Downtown Branch')).toBeInTheDocument();
    expect(screen.getByText('123 Main Street')).toBeInTheDocument();

    // Check for status badges
    const statusBadges = screen.queryAllByText(/Active|Inactive/i);
    expect(statusBadges.length).toBeGreaterThan(0);
  });

  it('displays pagination controls', async () => {
    renderWithClient(<BranchesPage />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryAllByTestId('skeleton')).toHaveLength(0);
    });

    // Check pagination info
    expect(screen.getByText(/Page \d+ of \d+/i)).toBeInTheDocument();

    // Check pagination buttons
    const prevButton = screen.getByRole('button', { name: 'Previous' });
    const nextButton = screen.getByRole('button', { name: 'Next' });

    expect(prevButton).toBeInTheDocument();
    expect(nextButton).toBeInTheDocument();
  });

  it('handles empty branch list', async () => {
    // Mock listBranches to return an empty page (bypass MSW to avoid precedence issues)
    const queries = await import('@/lib/api/queries');
    vi.spyOn(queries, 'listBranches').mockResolvedValue({
      content: [],
      number: 0,
      size: 10,
      totalElements: 0,
      totalPages: 0,
      first: true,
      last: true,
      empty: true,
      numberOfElements: 0,
    } as any);

    renderWithClient(<BranchesPage />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryAllByTestId('skeleton')).toHaveLength(0);
    });

    // Should show empty state message
    expect(screen.getByText(/No branches found/i)).toBeInTheDocument();

    // Check pagination still shows
    expect(screen.getByText(/Page \d+ of \d+/i)).toBeInTheDocument();
  });
});