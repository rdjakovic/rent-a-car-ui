import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "@/hooks/use-toast";
import { createCustomer, updateCustomer, type CustomerRequestDto, type CustomerResponseDto } from "@/lib/api/queries";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const isoDate = z
  .string()
  .min(1, "Required")
  .refine((v) => /\d{4}-\d{2}-\d{2}/.test(v), { message: "Use YYYY-MM-DD" });

const customerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional().or(z.literal("")),
  driverLicenseNo: z.string().min(3, "License number is required"),
  dateOfBirth: isoDate,
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  country: z.string().min(1, "Country is required"),
  licenseExpiryDate: isoDate,
});

export type CustomerFormValues = z.infer<typeof customerSchema>;

export default function CustomerFormDialog({
  open,
  onOpenChange,
  customer,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  customer?: CustomerResponseDto | null;
}) {
  const queryClient = useQueryClient();

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      driverLicenseNo: "",
      dateOfBirth: "",
      address: "",
      city: "",
      country: "",
      licenseExpiryDate: "",
    },
  });

  useEffect(() => {
    if (customer) {
      form.reset({
        firstName: customer.firstName ?? "",
        lastName: customer.lastName ?? "",
        email: customer.email ?? "",
        phone: customer.phone ?? "",
        driverLicenseNo: customer.driverLicenseNo ?? "",
        dateOfBirth: customer.dateOfBirth ?? "",
        address: customer.address ?? "",
        city: customer.city ?? "",
        country: customer.country ?? "",
        licenseExpiryDate: customer.licenseExpiryDate ?? "",
      });
    } else {
      form.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer, open]);

  const createMut = useMutation({
    mutationFn: (payload: CustomerRequestDto) => createCustomer(payload),
    onSuccess: () => {
      toast({ title: "Customer created" });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast({ title: "Create failed", description: e?.message ?? "Unknown error", variant: "destructive" as any }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: CustomerRequestDto }) => updateCustomer(id, payload),
    onSuccess: () => {
      toast({ title: "Customer updated" });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast({ title: "Update failed", description: e?.message ?? "Unknown error", variant: "destructive" as any }),
  });

  function onSubmit(values: CustomerFormValues) {
    const payload: CustomerRequestDto = {
      ...values,
      phone: values.phone || undefined,
    } as CustomerRequestDto;

    if (customer?.id != null) {
      updateMut.mutate({ id: customer.id!, payload });
    } else {
      createMut.mutate(payload);
    }
  }

  const submitting = createMut.isPending || updateMut.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{customer ? "Edit Customer" : "New Customer"}</DialogTitle>
          <DialogDescription>Enter customer details. All fields except phone are required.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="firstName" render={({ field }) => (
              <FormItem>
                <FormLabel>First name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="lastName" render={({ field }) => (
              <FormItem>
                <FormLabel>Last name</FormLabel>
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

            <FormField control={form.control} name="driverLicenseNo" render={({ field }) => (
              <FormItem>
                <FormLabel>Driver license No</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="licenseExpiryDate" render={({ field }) => (
              <FormItem>
                <FormLabel>License expiry date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="dateOfBirth" render={({ field }) => (
              <FormItem>
                <FormLabel>Date of birth</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="address" render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Address</FormLabel>
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

            <DialogFooter className="md:col-span-2 mt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
              <Button type="submit" disabled={submitting}>{customer ? "Save" : "Create"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

