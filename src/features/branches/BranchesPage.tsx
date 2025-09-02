import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { listBranches, type PageBranchResponseDto, type BranchResponseDto } from "@/lib/api/queries";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import BranchFormDialog from "./BranchFormDialog";

export default function BranchesPage() {
  const [page, setPage] = useState(0);
  const [size] = useState(10);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BranchResponseDto | null>(null);

  const query = useQuery({
    queryKey: ["branches", page, size],
    queryFn: () => listBranches({ page, size }),
    staleTime: 30_000,
    // Option 1: Use the helper (equivalent to your code)
    placeholderData: keepPreviousData,

    // Option 2: Your current approach (also correct)
    // placeholderData: (previousData) => previousData,

    // Option 3: More explicit with both parameters
    // placeholderData: (previousData, previousQuery) => previousData,
  });

  const isLoading = query.isLoading || query.isFetching && !query.data;
  const data = query.data as PageBranchResponseDto;
  const rows = data?.content ?? [];
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
                  <TableHead>Address</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>{b.name}</TableCell>
                    <TableCell>{b.address}</TableCell>
                    <TableCell>{b.city}</TableCell>
                    <TableCell>{b.country}</TableCell>
                    <TableCell>{b.phone}</TableCell>
                    <TableCell>{b.email}</TableCell>
                    <TableCell>{b.openingHours}</TableCell>
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
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-sm text-muted-foreground">
                      No branches found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

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
