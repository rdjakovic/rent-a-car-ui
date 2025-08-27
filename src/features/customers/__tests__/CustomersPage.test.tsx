import { render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import CustomersPage from "@/features/customers/CustomersPage";
import { vi } from "vitest";

// Mock the entire queries module
vi.mock("@/lib/api/queries", () => ({
  listCustomers: vi.fn().mockResolvedValue({
    content: [
      { id: 1, firstName: "Jane", lastName: "Doe", email: "jane@example.com", phone: "+123", driverLicenseNo: "X123", city: "Paris", country: "FR" },
    ],
    number: 0,
    size: 10,
    totalPages: 1,
    totalElements: 1,
    first: true,
    last: true,
    empty: false,
  }),
  // Mock other functions that might be imported to avoid undefined errors
  listBranches: vi.fn(),
  findAvailableCars: vi.fn(),
  listCars: vi.fn(),
  createCustomer: vi.fn(),
  updateCustomer: vi.fn(),
}));

function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
}

test("renders customers list", async () => {
  render(
    <Providers>
      <CustomersPage />
    </Providers>
  );

  await waitFor(() => expect(screen.getAllByTestId("customer-row").length).toBeGreaterThan(0));
  const row = screen.getAllByTestId("customer-row")[0];
  expect(within(row).getByText("jane@example.com")).toBeInTheDocument();
  expect(within(row).getByText(/Paris/)).toBeInTheDocument();
});

