import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  completeMaintenance,
  type CarResponseDto,
  type MaintenanceResponseDto,
} from "@/lib/api/queries";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSettings } from "@/hooks/useSettings";
import { formatMileage, mileageUnitLabel } from "@/lib/units";
import { todayString } from "@/lib/dates";
import { maintenanceErrorMessage } from "./maintenance";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: MaintenanceResponseDto;
  car?: CarResponseDto;
  onCompleted: (job: MaintenanceResponseDto) => void;
};

/** Finish a job in progress, recording what was spent, the odometer and when the car is next due. */
export function CompleteMaintenanceDialog({ open, onOpenChange, job, car, onCompleted }: Props) {
  const settings = useSettings();
  const [cost, setCost] = useState("");
  const [odometer, setOdometer] = useState("");
  const [nextServiceDate, setNextServiceDate] = useState("");
  const [notes, setNotes] = useState("");
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (!open) return;
    setCost(job.cost != null ? String(job.cost) : "");
    setOdometer(car?.mileage != null ? String(car.mileage) : "");
    setNextServiceDate("");
    setNotes(job.notes ?? "");
    setSubmitError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const costNumber = cost === "" ? undefined : Number(cost);
  const odometerNumber = odometer === "" ? undefined : Number(odometer);
  const currentMileage = car?.mileage;
  const validationError =
    costNumber != null && (Number.isNaN(costNumber) || costNumber < 0)
      ? "Cost must be a positive amount"
      : odometerNumber != null && (!Number.isInteger(odometerNumber) || odometerNumber < 0)
        ? "Odometer must be a whole number"
        : odometerNumber != null && currentMileage != null && odometerNumber < currentMileage
          ? `Odometer can't be lower than the car's recorded mileage (${formatMileage(currentMileage, settings.data?.mileageUnit)})`
          : nextServiceDate && nextServiceDate <= todayString()
            ? "Next service date must be in the future"
            : "";

  const complete = useMutation({
    mutationFn: () => completeMaintenance(job.id!, {
      cost: costNumber,
      odometerReading: odometerNumber,
      notes: notes.trim() || undefined,
      nextServiceDate: nextServiceDate || undefined,
    }),
    onSuccess: (updated) => {
      onOpenChange(false);
      onCompleted(updated);
    },
    onError: (error) => setSubmitError(maintenanceErrorMessage(error)),
  });

  const unitLabel = mileageUnitLabel(settings.data?.mileageUnit);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Complete maintenance</DialogTitle>
          <DialogDescription>
            The car becomes available again and its last service date is set to today.
          </DialogDescription>
        </DialogHeader>

        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!validationError) complete.mutate();
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="complete-cost" className="block text-sm font-medium mb-1">Final cost (USD)</label>
              <Input id="complete-cost" type="number" min="0" step="0.01" value={cost}
                     onChange={(e) => setCost(e.target.value)} />
            </div>
            <div>
              <label htmlFor="complete-odometer" className="block text-sm font-medium mb-1">
                Odometer{unitLabel && ` (${unitLabel})`}
              </label>
              <Input id="complete-odometer" type="number" min={currentMileage ?? 0} step="1" value={odometer}
                     onChange={(e) => setOdometer(e.target.value)} />
            </div>
          </div>

          <div>
            <label htmlFor="complete-next-service" className="block text-sm font-medium mb-1">Next service due</label>
            <Input id="complete-next-service" type="date" value={nextServiceDate}
                   onChange={(e) => setNextServiceDate(e.target.value)} />
            <p className="text-xs text-muted-foreground mt-1">Optional. The car shows up under "Due for service" as this date nears.</p>
          </div>

          <div>
            <label htmlFor="complete-notes" className="block text-sm font-medium mb-1">Notes</label>
            <Textarea id="complete-notes" maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {(validationError || submitError) && (
            <Alert variant="destructive">
              <AlertDescription>{validationError || submitError}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            <Button type="submit" disabled={!!validationError || complete.isPending}>
              {complete.isPending ? "Completing…" : "Complete job"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
