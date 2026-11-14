import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ReservationResponseDto } from "@/lib/api/queries";

type ReservationStatus = NonNullable<ReservationResponseDto["status"]>;

const VARIANTS: Record<ReservationStatus, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "secondary",
  CONFIRMED: "default",
  ACTIVE: "default",
  CANCELLED: "destructive",
  COMPLETED: "outline",
};

/** Reservation status as a badge, e.g. "Confirmed"; an active rental (car out) is shown in green. */
export function ReservationStatusBadge({ status, className }: { status: ReservationResponseDto["status"]; className?: string }) {
  if (!status) return null;
  return (
    <Badge
      variant={VARIANTS[status] ?? "secondary"}
      className={cn(status === "ACTIVE" && "bg-brand-emerald hover:bg-brand-emerald/80", className)}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </Badge>
  );
}
