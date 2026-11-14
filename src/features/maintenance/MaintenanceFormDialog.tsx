import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listCars,
  scheduleMaintenance,
  updateMaintenance,
  type MaintenanceResponseDto,
  type MaintenanceType,
} from "@/lib/api/queries";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { todayString } from "@/lib/dates";
import { MAINTENANCE_TYPES } from "./maintenance";
import { errorMessage } from "@/lib/api/errors";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Edit this job; without it a new job is scheduled */
  job?: MaintenanceResponseDto;
  /** Schedule for this car (the car can't be changed) */
  car?: { id: number; displayName?: string };
  defaultType?: MaintenanceType;
  onSaved?: (job: MaintenanceResponseDto) => void;
};

/** Schedule a maintenance job, or edit one that is still scheduled. */
export function MaintenanceFormDialog({ open, onOpenChange, job, car, defaultType, onSaved }: Props) {
  const queryClient = useQueryClient();
  const editing = !!job;
  const fixedCar = job?.car?.id ? { id: job.car.id, displayName: job.car.displayName } : car;

  const [carId, setCarId] = useState("");
  const [type, setType] = useState<MaintenanceType | "">("");
  const [description, setDescription] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [cost, setCost] = useState("");
  const [notes, setNotes] = useState("");
  const [submitError, setSubmitError] = useState("");

  // Start from the job (or the defaults) each time the dialog opens
  useEffect(() => {
    if (!open) return;
    setCarId(fixedCar?.id ? String(fixedCar.id) : "");
    setType(job?.maintenanceType ?? defaultType ?? "");
    setDescription(job?.description ?? "");
    setScheduledDate(job?.scheduledDate ?? "");
    setCost(job?.cost != null ? String(job.cost) : "");
    setNotes(job?.notes ?? "");
    setSubmitError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const carsQuery = useQuery({
    queryKey: ["cars", { page: 0, size: 200, sort: ["make,asc", "model,asc"] }],
    queryFn: () => listCars({ page: 0, size: 200, sort: ["make,asc", "model,asc"] }),
    enabled: open && !fixedCar,
    staleTime: 60_000,
  });

  // A new date can't be in the past; an overdue job being edited may keep its date
  const dateUnchanged = editing && scheduledDate === job?.scheduledDate;
  const costNumber = cost === "" ? undefined : Number(cost);
  const validationError =
    scheduledDate && scheduledDate < todayString() && !dateUnchanged
      ? "Scheduled date cannot be in the past"
      : costNumber != null && (Number.isNaN(costNumber) || costNumber < 0)
        ? "Cost must be a positive amount"
        : "";
  const complete = !!carId && !!type && description.trim() !== "" && !!scheduledDate;

  const save = useMutation({
    mutationFn: () => {
      const fields = {
        type: type as MaintenanceType,
        description: description.trim(),
        scheduledDate,
        cost: costNumber,
        notes: notes.trim() || undefined,
      };
      return editing
        ? updateMaintenance(job!.id!, fields)
        : scheduleMaintenance({ ...fields, carId: Number(carId) });
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
      toast({ title: editing ? "Maintenance updated" : "Maintenance scheduled" });
      onOpenChange(false);
      onSaved?.(saved);
    },
    onError: (error) => setSubmitError(errorMessage(error)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit maintenance" : "Schedule maintenance"}</DialogTitle>
          <DialogDescription>
            The car can't be booked on the scheduled day, and a day it is already booked can't be chosen.
          </DialogDescription>
        </DialogHeader>

        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (complete && !validationError) save.mutate();
          }}
        >
          <div>
            <label htmlFor="maintenance-car" className="block text-sm font-medium mb-1">Car</label>
            {fixedCar ? (
              <p id="maintenance-car" className="text-sm font-medium">{fixedCar.displayName ?? `Car #${fixedCar.id}`}</p>
            ) : (
              <Select value={carId} onValueChange={setCarId}>
                <SelectTrigger id="maintenance-car" aria-label="Car">
                  <SelectValue placeholder={carsQuery.isLoading ? "Loading cars…" : "Select a car"} />
                </SelectTrigger>
                <SelectContent>
                  {(carsQuery.data?.content ?? []).map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.displayName} · {c.branchName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="maintenance-type" className="block text-sm font-medium mb-1">Type</label>
              <Select value={type} onValueChange={(v) => setType(v as MaintenanceType)}>
                <SelectTrigger id="maintenance-type" aria-label="Type">
                  <SelectValue placeholder="Select a type" />
                </SelectTrigger>
                <SelectContent>
                  {MAINTENANCE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label htmlFor="maintenance-date" className="block text-sm font-medium mb-1">Scheduled date</label>
              <Input
                id="maintenance-date"
                type="date"
                min={dateUnchanged ? undefined : todayString()}
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label htmlFor="maintenance-description" className="block text-sm font-medium mb-1">Description</label>
            <Input
              id="maintenance-description"
              maxLength={1000}
              placeholder="e.g. Oil and filter change"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="maintenance-cost" className="block text-sm font-medium mb-1">Estimated cost (USD)</label>
            <Input
              id="maintenance-cost"
              type="number"
              min="0"
              step="0.01"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="maintenance-notes" className="block text-sm font-medium mb-1">Notes</label>
            <Textarea
              id="maintenance-notes"
              maxLength={2000}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {(validationError || submitError) && (
            <Alert variant="destructive">
              <AlertDescription>{validationError || submitError}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            <Button type="submit" disabled={!complete || !!validationError || save.isPending}>
              {save.isPending ? "Saving…" : editing ? "Save changes" : "Schedule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
