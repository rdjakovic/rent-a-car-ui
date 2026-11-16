import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "@/hooks/use-toast";
import { useSettings } from "@/hooks/useSettings";
import { errorMessage } from "@/lib/api/errors";
import { mileageUnitLabel } from "@/lib/units";
import {
  carImageUrl,
  createCar,
  deleteCarImage,
  listBranches,
  updateCar,
  uploadCarImages,
  type CarImageDto,
  type CarRequestDto,
  type CarResponseDto,
} from "@/lib/api/queries";
import CarImagePicker from "./CarImagePicker";
import { validateCarImageFiles } from "./carImages";
import { X } from "lucide-react";

const CATEGORIES = ["ECONOMY", "COMPACT", "INTERMEDIATE", "STANDARD", "FULL_SIZE", "PREMIUM", "LUXURY", "SUV", "VAN"] as const;
const TRANSMISSIONS = ["MANUAL", "AUTOMATIC", "CVT"] as const;
const FUEL_TYPES = ["GASOLINE", "DIESEL", "HYBRID", "ELECTRIC"] as const;
const ALL_STATUSES = [
  { value: "AVAILABLE", label: "Available" },
  { value: "RENTED", label: "Rented" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "OUT_OF_SERVICE", label: "Out of service" },
] as const;
// A new car is either on the lot or not; RENTED and MAINTENANCE are set by pick-up/return and maintenance jobs
const NEW_CAR_STATUSES = ALL_STATUSES.filter((status) => status.value === "AVAILABLE" || status.value === "OUT_OF_SERVICE");

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
  status: z.enum(["AVAILABLE", "RENTED", "MAINTENANCE", "OUT_OF_SERVICE"]),
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

function valuesFromCar(car: CarResponseDto): CarFormValues {
  return {
    vin: car.vin ?? "",
    make: car.make ?? "",
    model: car.model ?? "",
    year: car.year != null ? String(car.year) : "",
    category: car.category ?? "ECONOMY",
    transmission: car.transmission ?? "AUTOMATIC",
    fuelType: car.fuelType ?? "GASOLINE",
    seats: car.seats != null ? String(car.seats) : "5",
    mileage: car.mileage != null ? String(car.mileage) : "0",
    dailyPrice: car.dailyPrice != null ? Number(car.dailyPrice).toFixed(2) : "",
    branchId: car.branch?.id != null ? String(car.branch.id) : "",
    status: car.status ?? "AVAILABLE",
    color: car.color ?? "",
    licensePlate: car.licensePlate ?? "",
    insurancePolicy: car.insurancePolicy ?? "",
  };
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, the dialog edits this car instead of creating one. */
  car?: CarResponseDto;
};

/** Adds a car, or edits an existing one. Needs staff rights with the real backend security. */
export default function CarFormDialog({ open, onOpenChange, car }: Props) {
  const editing = !!car;
  const queryClient = useQueryClient();
  const settings = useSettings();
  const form = useForm<CarFormValues>({ resolver: zodResolver(carSchema), defaultValues: EMPTY });
  const [images, setImages] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<CarImageDto[]>([]);
  const [removedImageIds, setRemovedImageIds] = useState<number[]>([]);
  const [imageError, setImageError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      form.reset(car ? valuesFromCar(car) : EMPTY);
      setImages([]);
      setExistingImages(car?.images ?? []);
      setRemovedImageIds([]);
      setImageError("");
    }
    // Only reset when the dialog opens: a background refetch while editing must not wipe the form
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, car?.id]);

  // Cars can only be added to active branches (an inactive branch is closed); keep the current one when editing
  const branches = useQuery({
    queryKey: ["branches", "for-select", "car-form"],
    queryFn: () => listBranches({ page: 0, size: 100 }),
    enabled: open,
    staleTime: 60_000,
  });
  const selectableBranches = (branches.data?.content ?? [])
    .filter((b) => b.active || b.id === car?.branch?.id);

  async function onSubmit(v: CarFormValues) {
    const problem = validateCarImageFiles(images, existingImages.length);
    if (problem) {
      setImageError(problem);
      return;
    }

    setSaving(true);
    try {
      const payload: CarRequestDto = {
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
      };

      const saved = editing && car?.id != null
        ? await updateCar(car.id, payload)
        : await createCar(payload);

      const photoErrors: string[] = [];
      if (editing && car?.id != null) {
        for (const imageId of removedImageIds) {
          try {
            await deleteCarImage(car.id, imageId);
          } catch (error) {
            photoErrors.push(errorMessage(error));
            break;
          }
        }
      }
      if (images.length > 0 && saved.id != null) {
        try {
          await uploadCarImages(saved.id, images);
        } catch (error) {
          photoErrors.push(errorMessage(error));
        }
      }

      queryClient.invalidateQueries({ queryKey: ["cars"] });
      if (saved.id != null) queryClient.invalidateQueries({ queryKey: ["car", saved.id] });

      if (photoErrors.length > 0) {
        toast({
          title: editing ? "Car saved, but some photos could not be changed" : "Car added, but the photos could not be uploaded",
          description: photoErrors[0],
          variant: "destructive",
        });
        onOpenChange(false);
        return;
      }

      toast({ title: editing ? "Car updated" : "Car added", description: saved.displayName });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: editing ? "Could not save the car" : "Could not add the car",
        description: errorMessage(error),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  const unit = mileageUnitLabel(settings.data?.mileageUnit);
  const statusOptions = editing ? ALL_STATUSES : NEW_CAR_STATUSES;

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
          <DialogTitle>{editing ? "Edit car" : "Add a car"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Update this vehicle's details. Existing photos can be removed, and up to 5 photos are allowed in total."
              : "Add a vehicle to the fleet. VIN, make, model, year, daily price and branch are required. Photos are optional: up to 5, 5 MB each."}
          </DialogDescription>
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
                    {selectableBranches.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.name} · {b.city}</SelectItem>)}
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
                    {statusOptions.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormDescription>Rented and in-maintenance are set by rentals and maintenance jobs.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            {text("color", "Color")}
            {text("licensePlate", "License plate")}
            {text("insurancePolicy", "Insurance policy", {}, "md:col-span-2")}

            {existingImages.length > 0 && (
              <div className="md:col-span-2 space-y-2">
                <p className="text-sm font-medium">Current photos</p>
                <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5" aria-label="Current photos">
                  {existingImages.map((image, index) => (
                    <li key={image.id} className="relative">
                      <img
                        src={carImageUrl(image.url)}
                        alt={image.fileName ?? `Current photo ${index + 1}`}
                        className="h-20 w-full rounded-md border object-cover"
                      />
                      <button
                        type="button"
                        aria-label={`Remove current photo ${index + 1}`}
                        disabled={saving}
                        onClick={() => {
                          setImageError("");
                          setExistingImages((current) => current.filter((candidate) => candidate.id !== image.id));
                          setRemovedImageIds((current) => current.includes(image.id) ? current : [...current, image.id]);
                        }}
                        className="absolute -right-1.5 -top-1.5 rounded-full bg-destructive p-1 text-destructive-foreground shadow hover:bg-destructive/90 disabled:opacity-50"
                      >
                        <X className="h-3 w-3" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground">Removed photos are deleted when you save.</p>
              </div>
            )}

            <CarImagePicker
              files={images}
              onChange={setImages}
              onError={setImageError}
              error={imageError}
              disabled={saving}
              slotsUsed={existingImages.length}
            />

            <DialogFooter className="md:col-span-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving ? (editing ? "Saving…" : "Adding…") : (editing ? "Save changes" : "Add car")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
