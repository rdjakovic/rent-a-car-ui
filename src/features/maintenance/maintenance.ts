import type { MaintenanceResponseDto, MaintenanceStatus, MaintenanceType } from "@/lib/api/queries";
import { todayString } from "@/lib/dates";

export const MAINTENANCE_TYPES: { value: MaintenanceType; label: string }[] = [
  { value: "ROUTINE", label: "Routine service" },
  { value: "INSPECTION", label: "Inspection" },
  { value: "REPAIR", label: "Repair" },
  { value: "EMERGENCY", label: "Emergency" },
  { value: "RECALL", label: "Safety recall" },
];

export const MAINTENANCE_STATUSES: { value: MaintenanceStatus; label: string }[] = [
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

export function typeLabel(type: MaintenanceType | undefined) {
  return MAINTENANCE_TYPES.find((t) => t.value === type)?.label ?? type ?? "—";
}

export function statusLabel(status: MaintenanceStatus | undefined) {
  return MAINTENANCE_STATUSES.find((s) => s.value === status)?.label ?? status ?? "—";
}

export function statusBadgeVariant(status: MaintenanceStatus | undefined) {
  switch (status) {
    case "IN_PROGRESS":
      return "default" as const;
    case "COMPLETED":
      return "outline" as const;
    case "CANCELLED":
      return "destructive" as const;
    default:
      return "secondary" as const;
  }
}

export function isOpen(job: MaintenanceResponseDto) {
  return job.status === "SCHEDULED" || job.status === "IN_PROGRESS";
}

/** Scheduled for a day that has passed but never started. */
export function isOverdue(job: MaintenanceResponseDto) {
  return job.status === "SCHEDULED" && !!job.scheduledDate && job.scheduledDate < todayString();
}

/** An open safety recall: the car must not be rented until it is fixed. */
export function isOpenRecall(job: MaintenanceResponseDto) {
  return job.maintenanceType === "RECALL" && isOpen(job);
}

export function formatCost(amount: number | undefined, currency: string | undefined) {
  if (amount == null) return undefined;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format(amount);
}
