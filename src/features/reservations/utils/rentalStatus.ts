import type { ReservationResponseDto } from "@/lib/api/queries";
import { todayString } from "@/lib/dates";

/** A confirmed reservation can be picked up from its start date to its end date. */
export function canPickUp(reservation: ReservationResponseDto) {
  const today = todayString();
  return reservation.status === "CONFIRMED"
    && !!reservation.startDate && reservation.startDate <= today
    && !!reservation.endDate && today <= reservation.endDate;
}

/** The car is out (ACTIVE) and should already have come back. */
export function isOverdueReturn(reservation: ReservationResponseDto) {
  return reservation.status === "ACTIVE" && !!reservation.endDate && reservation.endDate < todayString();
}
