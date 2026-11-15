import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "@/hooks/use-toast";
import { useSettings } from "@/hooks/useSettings";
import { errorMessage } from "@/lib/api/errors";
import { mileageUnitLabel } from "@/lib/units";
import { createCar, listBranches, type CarRequestDto } from "@/lib/api/queries";

const CATEGORIES = ["ECONOMY", "COMPACT", "INTERMEDIATE", "STANDARD", "FULL_SIZE", "PREMIUM", "LUXURY", "SUV", "VAN"] as const;
const TRANSMISSIONS = ["MANUAL", "AUTOMATIC", "CVT"] as const;
const FUEL_TYPES = ["GASOLINE", "DIESEL", "HYBRID", "ELECTRIC"] as const;
// RENTED and MAINTENANCE are set by pick-up/return and maintenance jobs, so a new car is either on the lot or not
const STATUSES = [
  { value: "AVAILABLE", label: "Available" },
  { value: "OUT_OF_SERVICE", label: "Out of service" },
] as const;

const label = (value: string) => value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, " ");

/** A whole number within the backend's limits, kept as text while typing. */
const wholeNumber = (name: string, min: number, max: number) =>
  z.string().trim()
    .regex(/^\d+$/, `${name} must be a whole number`)
    .refine((v) => Number(v) >= min && Number(v) <= max, `${name} must be between ${min} and ${max}`);

// Same limits as the backend's CarRequestDto
const carSchema = z.object({
  vin: z.string().trim().toUpperCase()
    .regex(/^[A-HJ-NPR-Z0-9]{17}$/, "VIN must be 17 characters: letters and digits, without I, O or Q"),
  make: z.string().trim().min(1, "Make is required").max(50, "Make should not exceed 50 characters"),
  model: z.string().trim().min(1, "Model is required").max(50, "Model should not exceed 50 characters"),
  year: wholeNumber("Year", 1980, 2030),
  category: z.enum(CATEGORIES),
  transmission: z.enum(TRANSMISSIONS),
  fuelType: z.enum(FUEL_TYPES),
  seats: wholeNumber("Seats", 2, 20),
  mileage: z.string().trim().regex(/^\d+$/, "Mileage must be a whole number, 0 or more"),
  dailyPrice: z.string().trim()
    .regex(/^\d{1,4}(\.\d{1,2})?$/, "Daily price: up to 4 digits and 2 decimals, e.g. 45.50")
    .refine((v) => Number(v) >= 0.01, "Daily price should be greater than 0"),
  branchId: z.string().min(1, "Branch is required"),
  status: z.enum(["AVAILABLE", "OUT_OF_SERVICE"]),
  color: z.string().trim().max(30, "Color should not exceed 30 characters"),
  licensePlate: z.string().trim().max(20, "License plate should not exceed 20 characters"),
  insurancePolicy: z.string().trim().max(100, "Insurance policy should not exceed 100 characters"),
});

export type CarFormValues = z.infer<typeof carSchema>;

const EMPTY: CarFormValues = {
  vin: "", make: "", model: "", year: String(new Date().getFullYear()),
  category: "ECONOMY", transmission: "AUTOMATIC", fuelType: "GASOLINE",
  seats: "5", mileage: "0", dailyPrice: "", branchId: "", status: "AVAILABLE",
  color: "", licensePlate: "", insurancePolicy: "",
};

/** Adds a car to the fleet. Needs staff rights with the real backend security. */
export default function AddCarDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const settings = useSettings();
  const form = useForm<CarFormValues>({ resolver: zodResolver(carSchema), defaultValues: EMPTY });

  useEffect(() => {
    if (open) form.reset(EMPTY);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Cars can only be added to active branches (an inactive branch is closed)
  const branches = useQuery({
    queryKey: ["branches", "for-select", "add-car"],
    queryFn: () => listBranches({ page: 0, size: 100 }),
    enabled: open,
    staleTime: 60_000,
  });
  const activeBranches = (branches.data?.content ?? []).filter((b) => b.active);

  const create = useMutation({
    mutationFn: (payload: CarRequestDto) => createCar(payload),
    onSuccess: (car) => {
      toast({ title: "Car added", description: car.displayName });
      queryClient.invalidateQueries({ queryKey: ["cars"] });
      onOpenChange(false);
    },
    onError: (error) => toast({ title: "Could not add the car", description: errorMessage(error), variant: "destructive" }),
  });

  function onSubmit(v: CarFormValues) {
    create.mutate({
      vin: v.vin,
      make: v.make,
      model: v.model,
      year: Number(v.year),
      category: v.category,
      transmission: v.transmission,
      fuelType: v.fuelType,
      seats: Number(v.seats),
      mileage: Number(v.mileage),
      status: v.status,
      dailyPrice: Number(v.dailyPrice),
      branchId: Number(v.branchId),
      color: v.color || undefined,
      licensePlate: v.licensePlate || undefined,
      insurancePolicy: v.insurancePolicy || undefined,
    });
  }

  const unit = mileageUnitLabel(settings.data?.mileageUnit);

  const text = (name: keyof CarFormValues, title: string, props: React.ComponentProps<typeof Input> = {}, className?: string) => (
    <FormField control={form.control} name={name} render={({ field }) => (
      <FormItem className={className}>
        <FormLabel>{title}</FormLabel>
        <FormControl><Input {...props} {...field} /></FormControl>
        <FormMessage />
      </FormItem>
    )} />
  );

  const choice = (name: "category" | "transmission" | "fuelType", title: string, options: readonly string[]) => (
    <FormField control={form.control} name={name} render={({ field }) => (
      <FormItem>
        <FormLabel>{title}</FormLabel>
        <Select value={field.value} onValueChange={field.onChange}>
          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
          <SelectContent>
            {options.map((o) => <SelectItem key={o} value={o}>{label(o)}</SelectItem>)}
          </SelectContent>
        </Select>
        <FormMessage />
      </FormItem>
    )} />
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add a car</DialogTitle>
          <DialogDescription>Add a vehicle to the fleet. VIN, make, model, year, daily price and branch are required.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {text("vin", "VIN", { maxLength: 17, placeholder: "17 characters", autoComplete: "off" }, "md:col-span-2")}
            {text("make", "Make", { placeholder: "e.g. Toyota" })}
            {text("model", "Model", { placeholder: "e.g. Camry" })}
            {text("year", "Year", { inputMode: "numeric" })}
            {choice("category", "Category", CATEGORIES)}
            {choice("transmission", "Transmission", TRANSMISSIONS)}
            {choice("fuelType", "Fuel type", FUEL_TYPES)}
            {text("seats", "Seats", { inputMode: "numeric" })}
            {text("mileage", unit ? `Mileage (${unit})` : "Mileage", { inputMode: "numeric" })}
            {text("dailyPrice", "Daily price (USD)", { inputMode: "decimal", placeholder: "45.00" })}

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
                    {activeBranches.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.name} · {b.city}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="status" render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormDescription>Rented and in-maintenance are set by rentals and maintenance jobs.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            {text("color", "Color")}
            {text("licensePlate", "License plate")}
            {text("insurancePolicy", "Insurance policy", {}, "md:col-span-2")}

            <DialogFooter className="md:col-span-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={create.isPending}>{create.isPending ? "Adding…" : "Add car"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
