import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  completeReservation,
  getCarById,
  pickUpReservation,
  type ReservationResponseDto,
} from "@/lib/api/queries";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { useSettings } from "@/hooks/useSettings";
import { formatMileage, mileageUnitLabel } from "@/lib/units";

type Props = {
  /** "pickup": hand the car over; "return": the car is back */
  mode: "pickup" | "return";
  reservation: ReservationResponseDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone?: (updated: ReservationResponseDto) => void;
};

/** Records the odometer while handing a rental car over or taking it back. */
export function RentalHandoverDialog({ mode, reservation, open, onOpenChange, onDone }: Props) {
  const queryClient = useQueryClient();
  const settings = useSettings();
  const unit = settings.data?.mileageUnit;
  const pickup = mode === "pickup";
  const [odometer, setOdometer] = useState("");
  const [submitError, setSubmitError] = useState("");

  // The car's current mileage is the lowest valid reading
  const carId = reservation.car?.id;
  const carQuery = useQuery({
    queryKey: ["car", carId],
    queryFn: () => getCarById(carId!),
    enabled: open && !!carId,
  });
  const carMileage = carQuery.data?.mileage;
  const minimum = Math.max(carMileage ?? 0, pickup ? 0 : reservation.mileageOut ?? 0);

  useEffect(() => {
    if (!open) return;
    setOdometer(carMileage != null ? String(carMileage) : "");
    setSubmitError("");
  }, [open, carMileage]);

  const reading = odometer === "" ? undefined : Number(odometer);
  const validationError =
    reading != null && (!Number.isInteger(reading) || reading < 0)
      ? "Odometer must be a whole number"
      : reading != null && reading < minimum
        ? `Odometer can't be lower than ${formatMileage(minimum, unit)}`
        : "";

  const submit = useMutation({
    mutationFn: () => pickup
      ? pickUpReservation(reservation.id!, { mileageOut: reading })
      : completeReservation(reservation.id!, { mileageIn: reading }),
    onSuccess: (updated) => {
      // The car's status, mileage and (on return) branch changed too
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["car", carId] });
      queryClient.invalidateQueries({ queryKey: ["cars"] });
      toast({
        title: pickup ? "Car picked up" : "Car returned",
        description: `Reservation #${reservation.id} is now ${pickup ? "active" : "completed"}.`,
      });
      onOpenChange(false);
      onDone?.(updated);
    },
    onError: (error: any) => setSubmitError(
      error?.status === 403
        ? "You don't have permission to do this."
        : error?.detail ?? error?.message ?? "Something went wrong. Please try again."),
  });

  const unitLabel = mileageUnitLabel(unit);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{pickup ? "Pick up car" : "Return car"}</DialogTitle>
          <DialogDescription>
            {reservation.car?.displayName} · reservation #{reservation.id}
            {pickup
              ? ". The car is marked as rented until it comes back."
              : `. The car becomes available at ${reservation.dropoffBranch?.name ?? "the drop-off branch"}.`}
          </DialogDescription>
        </DialogHeader>

        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!validationError) submit.mutate();
          }}
        >
          <div>
            <label htmlFor="handover-odometer" className="block text-sm font-medium mb-1">
              Odometer{unitLabel && ` (${unitLabel})`}
            </label>
            <Input
              id="handover-odometer"
              type="number"
              min={minimum}
              step="1"
              value={odometer}
              onChange={(e) => setOdometer(e.target.value)}
            />
            {!pickup && reservation.mileageOut != null && (
              <p className="text-xs text-muted-foreground mt-1">
                At pick-up: {formatMileage(reservation.mileageOut, unit)}
              </p>
            )}
          </div>

          {(validationError || submitError) && (
            <Alert variant="destructive">
              <AlertDescription>{validationError || submitError}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            <Button type="submit" disabled={!!validationError || submit.isPending}>
              {submit.isPending ? "Saving…" : pickup ? "Pick up" : "Return"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
