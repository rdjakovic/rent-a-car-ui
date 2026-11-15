import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "@/hooks/use-toast";
import { errorMessage } from "@/lib/api/errors";
import { useAuthStore, useCan } from "@/lib/auth/authStore";
import {
  createUser,
  listBranches,
  updateUser,
  type UserResponseDto,
  type UserRole,
} from "@/lib/api/queries";

const ROLES: { value: UserRole; label: string }[] = [
  { value: "STAFF", label: "Staff" },
  { value: "MANAGER", label: "Manager" },
  { value: "ADMIN", label: "Administrator" },
];

// Radix Select can't hold an empty value, so "no branch" has its own
const NO_BRANCH = "none";

const userSchema = z.object({
  username: z.string().trim().max(50, "Username should not exceed 50 characters"),
  email: z.string().trim().email("Invalid email address").max(255, "Email should not exceed 255 characters"),
  password: z.string(),
  firstName: z.string().trim().min(1, "First name is required").max(100, "First name should not exceed 100 characters"),
  lastName: z.string().trim().min(1, "Last name is required").max(100, "Last name should not exceed 100 characters"),
  phone: z.string().trim().max(20, "Phone should not exceed 20 characters"),
  role: z.enum(["STAFF", "MANAGER", "ADMIN"]),
  branchId: z.string(),
  enabled: z.boolean(),
}).superRefine((values, ctx) => {
  if (values.password !== "") {
    if (values.password.length < 8) {
      ctx.addIssue({ code: "custom", path: ["password"], message: "Password needs at least 8 characters" });
    }
  }
  if (values.role !== "ADMIN" && values.branchId === NO_BRANCH) {
    ctx.addIssue({ code: "custom", path: ["branchId"], message: "Branch is required for staff and managers" });
  }
});

type UserFormValues = z.infer<typeof userSchema>;

const EMPTY: UserFormValues = {
  username: "", email: "", password: "", firstName: "", lastName: "", phone: "",
  role: "STAFF", branchId: NO_BRANCH, enabled: true,
};

/** Create an account (STAFF only for managers), or edit one (administrators). */
export default function UserFormDialog({
  open,
  onOpenChange,
  user,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Edit this account; without it a new one is created */
  user?: UserResponseDto | null;
}) {
  const queryClient = useQueryClient();
  const can = useCan();
  const canManage = can("USER_MANAGE");
  const me = useAuthStore((state) => state.user);
  const editing = !!user;
  const creating = !editing;
  const editingSelf = !!user?.id && user.id === me?.id;

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (!open) return;
    form.reset(user ? {
      username: user.username ?? "",
      email: user.email ?? "",
      password: "",
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
      phone: user.phone ?? "",
      role: (user.roles?.[0] as UserRole | undefined) ?? "STAFF",
      branchId: user.branchId != null ? String(user.branchId) : NO_BRANCH,
      enabled: user.enabled ?? true,
    } : EMPTY);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user]);

  const branches = useQuery({
    queryKey: ["branches", "for-select", "users"],
    queryFn: () => listBranches({ page: 0, size: 100 }),
    enabled: open,
    staleTime: 60_000,
  });

  const save = useMutation({
    mutationFn: (values: UserFormValues) => {
      const branchId = values.branchId === NO_BRANCH ? undefined : Number(values.branchId);
      return user?.id != null
        ? updateUser(user.id, {
            email: values.email,
            firstName: values.firstName,
            lastName: values.lastName,
            phone: values.phone || undefined,
            role: values.role,
            branchId,
            enabled: values.enabled,
          })
        : createUser({
            username: values.username,
            email: values.email,
            password: values.password,
            firstName: values.firstName,
            lastName: values.lastName,
            phone: values.phone || undefined,
            role: values.role,
            branchId,
          });
    },
    onSuccess: () => {
      toast({ title: editing ? "User updated" : "User created" });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      onOpenChange(false);
    },
    onError: (error) => toast({
      title: editing ? "Update failed" : "Create failed",
      description: errorMessage(error),
      variant: "destructive",
    }),
  });

  const roleOptions = canManage ? ROLES : ROLES.filter((r) => r.value === "STAFF");
  const role = form.watch("role");
  const branchRequired = role !== "ADMIN";

  function onSubmit(values: UserFormValues) {
    if (creating) {
      if (values.username.length < 3 || !/^[A-Za-z0-9._-]+$/.test(values.username)) {
        form.setError("username", { message: "3–50 characters: letters, digits, dot, dash or underscore" });
        return;
      }
      if (values.password.length < 8) {
        form.setError("password", { message: "Password needs at least 8 characters" });
        return;
      }
    }
    save.mutate(values);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit user" : "New user"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Change the details, role, branch or access of this account."
              : canManage
                ? "Accounts for staff and managers need a branch."
                : "New staff accounts need a branch."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField control={form.control} name="username" render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl><Input {...field} disabled={editing} placeholder="e.g. john.doe" /></FormControl>
                {editing && <FormDescription>Usernames can't be changed.</FormDescription>}
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl><Input type="email" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="firstName" render={({ field }) => (
              <FormItem>
                <FormLabel>First name</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="lastName" render={({ field }) => (
              <FormItem>
                <FormLabel>Last name</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="phone" render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {creating && (
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>Initial password</FormLabel>
                  <FormControl><Input type="password" autoComplete="new-password" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            <FormField control={form.control} name="role" render={({ field }) => (
              <FormItem>
                <FormLabel>Role</FormLabel>
                <Select value={field.value} onValueChange={field.onChange} disabled={!canManage && !creating}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    {roleOptions.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="branchId" render={({ field }) => (
              <FormItem>
                <FormLabel>Branch</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={branches.isPending ? "Loading…" : "Select a branch"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NO_BRANCH}>No branch</SelectItem>
                    {(branches.data?.content ?? []).map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>{b.name} ({b.city})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {branchRequired && <FormDescription>Required for staff and managers.</FormDescription>}
                <FormMessage />
              </FormItem>
            )} />

            {editing && (
              <FormField control={form.control} name="enabled" render={({ field }) => (
                <FormItem className="sm:col-span-2 flex flex-row items-start gap-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(checked === true)}
                      disabled={editingSelf}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Enabled</FormLabel>
                    <FormDescription>
                      {editingSelf
                        ? "You can't disable your own account."
                        : "A disabled account can't sign in, and its sessions end at once."}
                    </FormDescription>
                  </div>
                </FormItem>
              )} />
            )}

            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? "Saving…" : editing ? "Save changes" : "Create user"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
