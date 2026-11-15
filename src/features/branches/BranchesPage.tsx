import { useEffect, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { searchBranches, type BranchResponseDto } from "@/lib/api/queries";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchInput } from "@/components/ui/search-input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Plus } from "lucide-react";
import { useCan } from "@/lib/auth/authStore";
import BranchFormDialog from "./BranchFormDialog";

export default function BranchesPage() {
  const can = useCan();
  const canManage = can("BRANCH_MANAGE");
  const [page, setPage] = useState(0);
  const [size] = useState(10);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  // The dialog creates a branch (null) or edits one
  const [dialog, setDialog] = useState<{ branch: BranchResponseDto | null } | null>(null);

  // Back to the first page when the search changes
  useEffect(() => {
    setPage(0);
  }, [name, city]);

  const query = useQuery({
    queryKey: ["branches", "list", page, size, name.trim(), city.trim()],
    queryFn: () => searchBranches({ page, size, name: name.trim() || undefined, city: city.trim() || undefined }),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  const isLoading = query.isLoading || query.isFetching && !query.data;
  const data = query.data;
  const rows = data?.content ?? [];
  const current = data?.number ?? page;
  const totalPages = data?.totalPages ?? 0;
  const hasPrev = current > 0;
  const hasNext = totalPages ? current < totalPages - 1 : false;
  const searching = name.trim() !== "" || city.trim() !== "";

  return (
    <div className="container mx-auto py-6 px-4">
      <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Branches</CardTitle>
          {canManage && (
            <Button onClick={() => setDialog({ branch: null })}>
              <Plus className="h-4 w-4 mr-2" aria-hidden="true" /> New branch
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <SearchInput value={name} onChange={setName} placeholder="Search branches by name..." />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">City</label>
            <SearchInput value={city} onChange={setCity} placeholder="Search branches by city..." />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : query.isError ? (
          <Alert variant="destructive">
            <AlertTitle>Could not load branches</AlertTitle>
            <AlertDescription>{query.error.message}</AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            <Table className="min-w-[960px]">
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
                  <TableHead><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>{b.name}</TableCell>
                    <TableCell>{b.address}</TableCell>
                    <TableCell>{b.city}</TableCell>
                    <TableCell>{b.country}</TableCell>
                    <TableCell className="whitespace-nowrap">{b.phone}</TableCell>
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
                      {canManage && (
                        <Button variant="outline" size="sm" onClick={() => setDialog({ branch: b })} aria-label={`Edit ${b.name}`}>
                          Edit
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-sm text-muted-foreground">
                      {searching ? "No branches match your search." : "No branches found."}
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

    {canManage && (
      <BranchFormDialog
        open={dialog !== null}
        onOpenChange={(open) => !open && setDialog(null)}
        branch={dialog?.branch}
      />
    )}
    </div>
  );
}
