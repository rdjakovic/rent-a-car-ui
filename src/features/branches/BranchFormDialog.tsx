import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "@/hooks/use-toast";
import { errorMessage } from "@/lib/api/errors";
import { createBranch, updateBranch, type BranchRequestDto, type BranchResponseDto } from "@/lib/api/queries";

// Same limits as the backend's BranchRequestDto
const branchSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name should not exceed 100 characters"),
  address: z.string().trim().min(1, "Address is required").max(255, "Address should not exceed 255 characters"),
  city: z.string().trim().min(1, "City is required").max(100, "City should not exceed 100 characters"),
  country: z.string().trim().min(1, "Country is required").max(100, "Country should not exceed 100 characters"),
  phone: z.string().trim().regex(/^\+?[1-9]\d{1,14}$/, "Phone number should be valid, e.g. +15550101").or(z.literal("")),
  email: z.string().trim().email("Invalid email address").or(z.literal("")),
  openingHours: z.string().trim().max(500, "Opening hours should not exceed 500 characters"),
  active: z.boolean(),
});

export type BranchFormValues = z.infer<typeof branchSchema>;

const EMPTY: BranchFormValues = {
  name: "", address: "", city: "", country: "", phone: "", email: "", openingHours: "", active: true,
};

/** Create a branch, or edit one. Changing branches needs the ADMIN role with the real backend security. */
export default function BranchFormDialog({
  open,
  onOpenChange,
  branch,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Edit this branch; without it a new one is created */
  branch?: BranchResponseDto | null;
}) {
  const queryClient = useQueryClient();
  const form = useForm<BranchFormValues>({ resolver: zodResolver(branchSchema), defaultValues: EMPTY });

  // Start from the branch (or empty) each time the dialog opens
  useEffect(() => {
    if (!open) return;
    form.reset(branch ? {
      name: branch.name ?? "",
      address: branch.address ?? "",
      city: branch.city ?? "",
      country: branch.country ?? "",
      phone: branch.phone ?? "",
      email: branch.email ?? "",
      openingHours: branch.openingHours ?? "",
      active: branch.active ?? true,
    } : EMPTY);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch, open]);

  const save = useMutation({
    mutationFn: (payload: BranchRequestDto) => (branch?.id != null ? updateBranch(branch.id, payload) : createBranch(payload)),
    onSuccess: () => {
      toast({ title: branch ? "Branch updated" : "Branch created" });
      // Also refreshes the branch pickers (Availability, reservation edit, maintenance filter)
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      onOpenChange(false);
    },
    onError: (error) => toast({
      title: branch ? "Update failed" : "Create failed",
      description: errorMessage(error),
      variant: "destructive",
    }),
  });

  function onSubmit(values: BranchFormValues) {
    save.mutate({
      ...values,
      phone: values.phone || undefined,
      email: values.email || undefined,
      openingHours: values.openingHours || undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{branch ? "Edit branch" : "New branch"}</DialogTitle>
          <DialogDescription>Name, address, city and country are required.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl><Input {...field} /></FormControl>
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

            <FormField control={form.control} name="phone" render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl><Input placeholder="+15550101" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="city" render={({ field }) => (
              <FormItem>
                <FormLabel>City</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="country" render={({ field }) => (
              <FormItem>
                <FormLabel>Country</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="address" render={({ field }) => (
              <FormItem>
                <FormLabel>Address</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="openingHours" render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Opening hours</FormLabel>
                <FormControl><Input placeholder="Mon-Fri 8:00-18:00" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="active" render={({ field }) => (
              <FormItem className="md:col-span-2 flex flex-row items-start gap-3 space-y-0">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Active</FormLabel>
                  <FormDescription>
                    Inactive branches are closed: their cars aren't offered for booking and they can't be a pick-up or return location.
                  </FormDescription>
                </div>
              </FormItem>
            )} />

            <DialogFooter className="md:col-span-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? "Saving…" : branch ? "Save changes" : "Create branch"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
