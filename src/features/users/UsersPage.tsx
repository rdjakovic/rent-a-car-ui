import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SearchInput } from "@/components/ui/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Users } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { errorMessage } from "@/lib/api/errors";
import { getUser, listUsers, updateUser, type UserResponseDto, type UserRole } from "@/lib/api/queries";
import { ROLE_LABELS, highestRole } from "@/lib/auth/roles";
import { useResetPageOnChange } from "@/hooks/useResetPageOnChange";
import { useAuthStore, useCan } from "@/lib/auth/authStore";
import UserFormDialog from "./UserFormDialog";
import ResetPasswordDialog from "./ResetPasswordDialog";

const PAGE_SIZE = 10;

/** Accounts left without a role or (for staff and managers) a branch, e.g. former customers, need the edit dialog first */
const needsDetails = (user: UserResponseDto) => {
  const role = highestRole(user);
  return !role || (role !== "ADMIN" && user.branchId == null);
};

const fullName = (user: UserResponseDto) =>
  [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || "";

/** The accounts. Managers can look and create staff; administrators can also edit, disable and reset passwords. */
export default function UsersPage() {
  const queryClient = useQueryClient();
  const can = useCan();
  const canCreate = can("USER_CREATE_STAFF");
  const canManage = can("USER_MANAGE");
  const me = useAuthStore((state) => state.user);

  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<UserRole | "ALL">("ALL");
  // The dialog creates an account (null) or edits one
  const [form, setForm] = useState<{ user: UserResponseDto | null } | null>(null);
  const [resetFor, setResetFor] = useState<UserResponseDto | null>(null);
  const [toggle, setToggle] = useState<UserResponseDto | null>(null);

  useResetPageOnChange([search, role], setPage);

  const query = useQuery({
    queryKey: ["users", "list", page, PAGE_SIZE, search.trim(), role],
    queryFn: () => listUsers({
      page,
      size: PAGE_SIZE,
      search: search.trim() || undefined,
      role: role === "ALL" ? undefined : role,
    }),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  const rows = query.data?.content ?? [];
  const current = query.data?.number ?? page;
  const totalPages = query.data?.totalPages ?? 0;
  const hasPrev = current > 0;
  const hasNext = totalPages ? current < totalPages - 1 : false;
  const searching = search.trim() !== "" || role !== "ALL";

  const toggleEnabled = useMutation({
    mutationFn: async (user: UserResponseDto) => {
      // Built from the account as it is now, not from the (up to 30 seconds old) list row, so a change another
      // administrator just made isn't undone. The target state is what this administrator saw and chose.
      const current = await getUser(user.id!);
      const role = highestRole(current);
      if (!role) throw new Error("This account has no role. Edit it to choose one.");
      return updateUser(current.id!, {
        email: current.email ?? "",
        firstName: current.firstName ?? "",
        lastName: current.lastName ?? "",
        phone: current.phone,
        role,
        branchId: current.branchId,
        enabled: !user.enabled,
      });
    },
    onSuccess: (updated) => {
      toast({
        title: updated.enabled ? "Account enabled" : "Account disabled",
        description: updated.enabled
          ? `${fullName(updated)} can sign in again.`
          : `${fullName(updated)} can no longer sign in.`,
      });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setToggle(null);
    },
    onError: (error) => {
      toast({ title: "Could not change the account", description: errorMessage(error), variant: "destructive" });
      setToggle(null);
    },
  });

  return (
    <div className="container mx-auto py-6 px-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Users</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Staff accounts, their roles and their branches</p>
            </div>
            {canCreate && (
              <Button onClick={() => setForm({ user: null })}>
                <Plus className="h-4 w-4 mr-2" aria-hidden="true" /> New user
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Search</label>
              <SearchInput value={search} onChange={setSearch} placeholder="Search by name, username or email..." />
            </div>
            <div>
              <label htmlFor="user-role-filter" className="block text-sm font-medium mb-1">Role</label>
              <Select value={role} onValueChange={(v) => setRole(v as UserRole | "ALL")}>
                <SelectTrigger id="user-role-filter" aria-label="Role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All roles</SelectItem>
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {query.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : query.isError ? (
            <Alert variant="destructive">
              <AlertTitle>Could not load users</AlertTitle>
              <AlertDescription>{query.error.message}</AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              <Table responsive className="sm:min-w-[960px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead><span className="sr-only">Actions</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell data-label="Name" className="font-medium">{fullName(u)}</TableCell>
                      <TableCell data-label="Username">{u.username}</TableCell>
                      <TableCell data-label="Email">{u.email}</TableCell>
                      <TableCell data-label="Role">{highestRole(u) ? ROLE_LABELS[highestRole(u)!] : "—"}</TableCell>
                      <TableCell data-label="Branch">{u.branchName ?? "—"}</TableCell>
                      <TableCell data-label="Status">
                        {u.enabled === false
                          ? <Badge variant="secondary">Disabled</Badge>
                          : <Badge variant="default">Active</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        {canManage ? (
                          <div className="flex flex-wrap justify-end gap-1 max-sm:mt-2">
                            <Button variant="outline" size="sm" onClick={() => setForm({ user: u })}
                                    aria-label={`Edit ${u.username}`}>
                              Edit
                            </Button>
                            {/* Your own password is changed from the account menu, which keeps this session */}
                            {u.id !== me?.id && (
                              <Button variant="outline" size="sm" onClick={() => setResetFor(u)}
                                      aria-label={`Reset password for ${u.username}`}>
                                Reset password
                              </Button>
                            )}
                            {u.id !== me?.id && (
                              <Button
                                variant="outline"
                                size="sm"
                                className={u.enabled === false ? undefined : "text-destructive"}
                                onClick={() => (needsDetails(u) ? setForm({ user: u }) : setToggle(u))}
                                aria-label={`${u.enabled === false ? "Enable" : "Disable"} ${u.username}`}
                              >
                                {u.enabled === false ? "Enable" : "Disable"}
                              </Button>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">View only</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10">
                        <Users className="mx-auto h-8 w-8 text-muted-foreground mb-2" aria-hidden="true" />
                        <p className="text-sm text-muted-foreground">
                          {searching ? "No users match the search." : "No users found."}
                        </p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-muted-foreground">
                  Page {current + 1} of {Math.max(totalPages, 1)}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setPage((p) => Math.max(0, p - 1))}
                          disabled={!hasPrev || query.isFetching}>
                    Previous
                  </Button>
                  <Button variant="outline" onClick={() => setPage((p) => p + 1)}
                          disabled={!hasNext || query.isFetching}>
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <UserFormDialog
        key={form?.user?.id ?? "new"}
        open={form !== null}
        onOpenChange={(open) => !open && setForm(null)}
        user={form?.user}
      />

      <ResetPasswordDialog
        open={resetFor !== null}
        onOpenChange={(open) => !open && setResetFor(null)}
        user={resetFor}
      />

      <Dialog open={toggle !== null} onOpenChange={(open) => !open && setToggle(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{toggle?.enabled === false ? "Enable this account?" : "Disable this account?"}</DialogTitle>
            <DialogDescription>
              {toggle && (toggle.enabled === false
                ? `${fullName(toggle)} will be able to sign in again.`
                : `${fullName(toggle)} won't be able to sign in, and any session they have ends now.`)}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToggle(null)}>Cancel</Button>
            <Button
              variant={toggle?.enabled === false ? "default" : "destructive"}
              disabled={toggleEnabled.isPending}
              onClick={() => toggle && toggleEnabled.mutate(toggle)}
            >
              {toggleEnabled.isPending ? "Saving…" : toggle?.enabled === false ? "Enable" : "Disable"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
