import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listCustomers, type CustomerSearchParams, type CustomerResponseDto } from "@/lib/api/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SearchInput } from "@/components/ui/search-input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import CustomerFormDialog from "./CustomerFormDialog";

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [size] = useState(10);

  const params: CustomerSearchParams = useMemo(() => ({ search: search || undefined, page, size }), [search, page, size]);

  const query = useQuery({
    queryKey: ["customers", params],
    queryFn: () => listCustomers(params),
    keepPreviousData: true,
    staleTime: 30_000,
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerResponseDto | null>(null);

  const isLoading = query.isLoading || (query.isFetching && !query.data);
  const data = query.data;
  const rows = data?.content ?? [];
  const current = data?.number ?? page;
  const totalPages = data?.totalPages ?? 0;
  const hasPrev = current > 0;
  const hasNext = totalPages ? current < totalPages - 1 : false;

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="grid gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-charcoal">Customers</h1>
            <p className="text-muted-foreground">Search and manage customers</p>
          </div>
          <Button onClick={() => { setEditing(null); setOpen(true); }}>New Customer</Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Search</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="md:col-span-2 lg:col-span-1">
                <label className="block text-sm font-medium mb-1">Search customers</label>
                <SearchInput
                  placeholder="Search by name, email, phone, city..."
                  value={search}
                  onChange={(value) => { setSearch(value); setPage(0); }}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Search across first name, last name, email, city, and license number
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Driver License</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((c: CustomerResponseDto) => (
                      <TableRow key={c.id} data-testid="customer-row">
                        <TableCell>{c.fullName ?? `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim()}</TableCell>
                        <TableCell>{c.email}</TableCell>
                        <TableCell>{c.phone}</TableCell>
                        <TableCell>{c.driverLicenseNo}</TableCell>
                        <TableCell>{c.city}</TableCell>
                        <TableCell>{c.country}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => { setEditing(c); setOpen(true); }}>Edit</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {rows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                          No customers found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">Page {current + 1} of {Math.max(totalPages, 1)}</div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={!hasPrev || query.isFetching}>Previous</Button>
                    <Button variant="outline" onClick={() => setPage((p) => p + 1)} disabled={!hasNext || query.isFetching}>Next</Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <CustomerFormDialog open={open} onOpenChange={setOpen} customer={editing} />
    </div>
  );
}

