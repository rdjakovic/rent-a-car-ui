import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listBranches, updateReservation, type ReservationResponseDto } from "@/lib/api/queries";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { errorMessage } from "@/lib/api/errors";
import { todayString } from "@/lib/dates";

type Props = {
  reservation: ReservationResponseDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (updated: ReservationResponseDto) => void;
};

const DAY_MS = 86_400_000;

/** Charged days as the backend counts them: a same-day rental is one day. */
function rentalDays(startDate: string, endDate: string) {
  const days = Math.round((Date.parse(endDate) - Date.parse(startDate)) / DAY_MS);
  return Math.max(1, days);
}

/**
 * Change the dates, drop-off branch or notes of a PENDING reservation. The car and pick-up branch stay;
 * the backend re-checks availability and recalculates the price.
 */
export function EditReservationDialog({ reservation, open, onOpenChange, onSaved }: Props) {
  const queryClient = useQueryClient();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dropoffBranchId, setDropoffBranchId] = useState("");
  const [notes, setNotes] = useState("");
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (!open) return;
    setStartDate(reservation.startDate ?? "");
    setEndDate(reservation.endDate ?? "");
    setDropoffBranchId(reservation.dropoffBranch?.id ? String(reservation.dropoffBranch.id) : "");
    setNotes(reservation.notes ?? "");
    setSubmitError("");
  }, [open, reservation]);

  const branches = useQuery({
    queryKey: ["branches", { page: 0, size: 100 }],
    queryFn: () => listBranches({ page: 0, size: 100 }),
    enabled: open,
    staleTime: 5 * 60_000,
  });

  const today = todayString();
  const validationError =
    !startDate || !endDate
      ? ""
      : startDate < today
        ? "Pickup date cannot be in the past"
        : endDate < startDate
          ? "Return date cannot be before pickup date"
          : "";
  const complete = !!startDate && !!endDate && !!dropoffBranchId;
  const newTotal = complete && !validationError && reservation.dailyRate != null
    ? reservation.dailyRate * rentalDays(startDate, endDate)
    : undefined;

  const save = useMutation({
    mutationFn: () => updateReservation(reservation.id!, {
      customerId: reservation.customer!.id!,
      carId: reservation.car!.id!,
      pickupBranchId: reservation.pickupBranch!.id!,
      dropoffBranchId: Number(dropoffBranchId),
      startDate,
      endDate,
      notes: notes.trim() || undefined,
    }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      toast({ title: "Reservation updated", description: `Reservation #${reservation.id} has been updated.` });
      onOpenChange(false);
      onSaved?.(updated);
    },
    onError: (error) => setSubmitError(errorMessage(error)),
  });

  const money = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: reservation.currency || "USD" }).format(amount);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit reservation #{reservation.id}</DialogTitle>
          <DialogDescription>
            {reservation.car?.displayName} from {reservation.pickupBranch?.name}. The car and pick-up branch can't be changed here.
          </DialogDescription>
        </DialogHeader>

        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (complete && !validationError) save.mutate();
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="edit-start" className="block text-sm font-medium mb-1">Pickup date</label>
              <Input id="edit-start" type="date" min={today} value={startDate}
                     onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <label htmlFor="edit-end" className="block text-sm font-medium mb-1">Return date</label>
              <Input id="edit-end" type="date" min={startDate || today} value={endDate}
                     onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          <div>
            <label htmlFor="edit-dropoff" className="block text-sm font-medium mb-1">Return location</label>
            <Select value={dropoffBranchId} onValueChange={setDropoffBranchId}>
              <SelectTrigger id="edit-dropoff" aria-label="Return location">
                <SelectValue placeholder={reservation.dropoffBranch?.name ?? "Select a branch"} />
              </SelectTrigger>
              <SelectContent>
                {(branches.data?.content ?? []).map((b) => (
                  <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label htmlFor="edit-notes" className="block text-sm font-medium mb-1">Notes</label>
            <Textarea id="edit-notes" maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {newTotal != null && (
            <p className="text-sm">
              New total: <span className="font-semibold">{money(newTotal)}</span>
              {reservation.totalPrice != null && newTotal !== reservation.totalPrice && (
                <span className="text-muted-foreground"> (was {money(reservation.totalPrice)})</span>
              )}
            </p>
          )}

          {(validationError || submitError) && (
            <Alert variant="destructive">
              <AlertDescription>{validationError || submitError}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            <Button type="submit" disabled={!complete || !!validationError || save.isPending}>
              {save.isPending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
