import { CalendarClock } from "lucide-react";
import type { CarResponseDto } from "@/lib/api/queries";
import { todayString } from "@/lib/dates";
import { cn } from "@/lib/utils";

type NextReservation = NonNullable<CarResponseDto["nextReservation"]>;

/** "Nov 14" style date for a yyyy-mm-dd string (parsed as a local date). */
function shortDate(date: string | undefined) {
  if (!date) return "?";
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Describes when the car is taken: the car's status only says whether it is on the lot right now. */
export function describeNextBooking(next: NextReservation, today = todayString()) {
  const range = next.startDate === next.endDate
    ? shortDate(next.startDate)
    : `${shortDate(next.startDate)} – ${shortDate(next.endDate)}`;
  const pending = next.status === "PENDING" ? " (pending)" : "";

  if (next.status === "ACTIVE") {
    return next.endDate && next.endDate < today
      ? { text: `On rent, overdue since ${shortDate(next.endDate)}`, urgent: true }
      : { text: `On rent until ${shortDate(next.endDate)}`, urgent: false };
  }
  if (next.startDate && next.startDate <= today) {
    return { text: `Booked today${next.endDate !== today ? ` until ${shortDate(next.endDate)}` : ""}${pending}`, urgent: true };
  }
  return { text: `Next booking: ${range}${pending}`, urgent: false };
}

export function NextBooking({ next, emptyText, className }: {
  next: CarResponseDto["nextReservation"];
  /** Shown when there is no upcoming booking; nothing is shown without it */
  emptyText?: string;
  className?: string;
}) {
  if (!next) {
    return emptyText ? <p className={cn("text-sm text-muted-foreground", className)}>{emptyText}</p> : null;
  }
  const { text, urgent } = describeNextBooking(next);
  return (
    <p className={cn("flex items-center gap-1 text-sm", urgent ? "text-brand-orange font-medium" : "text-muted-foreground", className)}>
      <CalendarClock className="h-4 w-4 shrink-0" aria-hidden="true" />
      {text}
    </p>
  );
}
