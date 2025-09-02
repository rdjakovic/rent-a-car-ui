import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { searchBranches, type PageBranchResponseDto, type BranchResponseDto } from "@/lib/api/queries";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchInput } from "@/components/ui/search-input";

import BranchFormDialog from "./BranchFormDialog";

export default function BranchesPage() {
  const [page, setPage] = useState(0);
  const [size] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [citySearchTerm, setCitySearchTerm] = useState("");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BranchResponseDto | null>(null);

  const query = useQuery({
    queryKey: ["branches", page, size, searchTerm, citySearchTerm],
    queryFn: () => searchBranches({ page, size, name: searchTerm, city: citySearchTerm }),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setPage(0); // Reset to first page when search changes
  };

  const handleCitySearchChange = (value: string) => {
    setCitySearchTerm(value);
    setPage(0); // Reset to first page when search changes
  };

  const isLoading = query.isLoading || query.isFetching && !query.data;
  const data = query.data as PageBranchResponseDto;
  const rows = data?.content ?? [];

  // Filter rows by city when both search terms are provided
  const filteredRows = (searchTerm.trim() && citySearchTerm.trim())
    ? rows.filter(branch =>
        branch.city && branch.city.toLowerCase().includes(citySearchTerm.toLowerCase())
      )
    : rows;

  const current = data?.number ?? page;
  const totalPages = data?.totalPages ?? 0;
  const hasPrev = current > 0;
  const hasNext = totalPages ? current < totalPages - 1 : false;

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-charcoal">Branches</h1>
          <p className="text-muted-foreground">Manage your branch locations</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}>New Branch</Button>
      </div>

      <Card>
      <CardHeader>
        <div className="flex flex-col gap-4">
          <CardTitle>Results</CardTitle>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <SearchInput
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search branches by name..."
              className="max-w-sm"
            />
            <SearchInput
              value={citySearchTerm}
              onChange={handleCitySearchChange}
              placeholder="Search branches by city..."
              className="max-w-sm"
            />
          </div>
        </div>
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
            {/* Large Desktop Table View - Full columns */}
            <div className="hidden xl:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[140px]">Name</TableHead>
                    <TableHead className="w-[160px]">Address</TableHead>
                    <TableHead className="w-[100px]">City</TableHead>
                    <TableHead className="w-[80px]">Country</TableHead>
                    <TableHead className="w-[120px]">Phone</TableHead>
                    <TableHead className="w-[180px]">Email</TableHead>
                    <TableHead className="w-[140px]">Hours</TableHead>
                    <TableHead className="w-[80px]">Status</TableHead>
                    <TableHead className="w-[80px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.name}</TableCell>
                      <TableCell>{b.address}</TableCell>
                      <TableCell>{b.city}</TableCell>
                      <TableCell>{b.country}</TableCell>
                      <TableCell>{b.phone}</TableCell>
                      <TableCell className="break-all">{b.email}</TableCell>
                      <TableCell className="text-sm">{b.openingHours}</TableCell>
                      <TableCell>
                        {b.active ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => { setEditing(b); setOpen(true); }}>Edit</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredRows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-sm text-muted-foreground">
                        No branches found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Medium Desktop Table View - Condensed columns */}
            <div className="hidden lg:block xl:hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Name</TableHead>
                    <TableHead className="w-[140px]">Address</TableHead>
                    <TableHead className="w-[80px]">City</TableHead>
                    <TableHead className="w-[100px]">Phone</TableHead>
                    <TableHead className="w-[160px]">Email</TableHead>
                    <TableHead className="w-[80px]">Status</TableHead>
                    <TableHead className="w-[80px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.name}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{b.address}</div>
                          <div className="text-muted-foreground">{b.city}, {b.country}</div>
                        </div>
                      </TableCell>
                      <TableCell>{b.city}</TableCell>
                      <TableCell className="text-sm">{b.phone}</TableCell>
                      <TableCell className="break-all text-sm">{b.email}</TableCell>
                      <TableCell>
                        {b.active ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => { setEditing(b); setOpen(true); }}>Edit</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredRows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                        No branches found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Tablet Card View */}
            <div className="lg:hidden space-y-4">
              {filteredRows.map((b) => (
                <Card key={b.id} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{b.name}</h3>
                        <p className="text-sm text-muted-foreground">{b.address}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {b.active ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                        <Button variant="outline" size="sm" onClick={() => { setEditing(b); setOpen(true); }}>
                          Edit
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">City:</span>
                        <span>{b.city}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Country:</span>
                        <span>{b.country}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Phone:</span>
                        <span>{b.phone}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Email:</span>
                        <span className="break-all">{b.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Hours:</span>
                        <span className="text-right">{b.openingHours}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
              {filteredRows.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-8">
                  No branches found.
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Page {current + 1} of {Math.max(totalPages, 1)}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={!hasPrev || query.isFetching}>
                  Previous
                </Button>
                <Button variant="outline" onClick={() => setPage((p) => p + 1)} disabled={!hasNext || query.isFetching}>
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>

    <BranchFormDialog open={open} onOpenChange={setOpen} branch={editing} />
    </div>
  );
}
