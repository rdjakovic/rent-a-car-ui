import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "@/hooks/use-toast";
import { createBranch, updateBranch, type BranchRequestDto, type BranchResponseDto } from "@/lib/api/queries";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const branchSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  country: z.string().min(1, "Country is required"),
  phone: z.string().optional().or(z.literal("")),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  openingHours: z.string().optional().or(z.literal("")),
  active: z.boolean().optional(),
});

export type BranchFormValues = z.infer<typeof branchSchema>;

export default function BranchFormDialog({
  open,
  onOpenChange,
  branch,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  branch?: BranchResponseDto | null;
}) {
  const queryClient = useQueryClient();

  const form = useForm<BranchFormValues>({
    resolver: zodResolver(branchSchema),
    defaultValues: {
      name: "",
      address: "",
      city: "",
      country: "",
      phone: "",
      email: "",
      openingHours: "",
      active: true,
    },
  });

  useEffect(() => {
    if (branch) {
      form.reset({
        name: branch.name ?? "",
        address: branch.address ?? "",
        city: branch.city ?? "",
        country: branch.country ?? "",
        phone: branch.phone ?? "",
        email: branch.email ?? "",
        openingHours: branch.openingHours ?? "",
        active: branch.active ?? true,
      });
    } else {
      form.reset({
        name: "",
        address: "",
        city: "",
        country: "",
        phone: "",
        email: "",
        openingHours: "",
        active: true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch, open]);

  const createMut = useMutation({
    mutationFn: (payload: BranchRequestDto) => createBranch(payload),
    onSuccess: () => {
      toast({ title: "Branch created" });
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast({ title: "Create failed", description: e?.message ?? "Unknown error", variant: "destructive" as any }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: BranchRequestDto }) => updateBranch(id, payload),
    onSuccess: () => {
      toast({ title: "Branch updated" });
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast({ title: "Update failed", description: e?.message ?? "Unknown error", variant: "destructive" as any }),
  });

  function onSubmit(values: BranchFormValues) {
    const payload: BranchRequestDto = {
      ...values,
      phone: values.phone || undefined,
      email: values.email || undefined,
      openingHours: values.openingHours || undefined,
      active: values.active,
    } as BranchRequestDto;

    if (branch?.id != null) {
      updateMut.mutate({ id: branch.id!, payload });
    } else {
      createMut.mutate(payload);
    }
  }

  const submitting = createMut.isPending || updateMut.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{branch ? "Edit Branch" : "New Branch"}</DialogTitle>
          <DialogDescription>Enter branch details. Name, address, city, and country are required.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="phone" render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="city" render={({ field }) => (
              <FormItem>
                <FormLabel>City</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="country" render={({ field }) => (
              <FormItem>
                <FormLabel>Country</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="active" render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                <div className="space-y-0.5">
                  <FormLabel>Active</FormLabel>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )} />

            <FormField control={form.control} name="address" render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Address</FormLabel>
                <FormControl>
                  <Textarea {...field} rows={3} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="openingHours" render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Opening Hours</FormLabel>
                <FormControl>
                  <Textarea {...field} rows={2} placeholder="e.g., Mon-Fri: 9AM-6PM, Sat: 9AM-4PM, Sun: Closed" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <DialogFooter className="md:col-span-2 mt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
              <Button type="submit" disabled={submitting}>{branch ? "Save" : "Create"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}