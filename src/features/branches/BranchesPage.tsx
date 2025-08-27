import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listBranches } from "@/lib/api/queries";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function BranchesPage() {
  const [page, setPage] = useState(0);
  const [size] = useState(10);

  const query = useQuery({
    queryKey: ["branches", page, size],
    queryFn: () => listBranches({ page, size }),
    staleTime: 30_000,
    keepPreviousData: true,
  });

  const isLoading = query.isLoading || query.isFetching && !query.data;
  const data = query.data;
  const rows = data?.content ?? [];
  const current = data?.number ?? page;
  const totalPages = data?.totalPages ?? 0;
  const hasPrev = current > 0;
  const hasNext = totalPages ? current < totalPages - 1 : false;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Branches</CardTitle>
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
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-sm text-muted-foreground">
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
  );
}
