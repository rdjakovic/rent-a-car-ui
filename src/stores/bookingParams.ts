import { todayString } from "@/lib/dates";

export const REQUIRED_BOOKING_PARAMS = ["carId", "branchId", "startDate", "endDate", "dailyPrice"] as const;

const RESTART = "Please start from the availability search.";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** A real calendar date in yyyy-mm-dd form (so 2026-02-31 and "tomorrow" are rejected). */
function isIsoDate(value: string) {
  if (!ISO_DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export type BookingParamsValidation = { isValid: true } | { isValid: false; error: string };

/**
 * Checks the booking page's URL parameters (what the availability search and the car details page
 * put in the link). Same-day rentals are valid (end on the start date); the start date can't be
 * before today's local date. Used by the wizard (to show the reason) and the booking hook.
 */
export function validateBookingParams(searchParams: URLSearchParams): BookingParamsValidation {
  const missing = REQUIRED_BOOKING_PARAMS.filter((param) => !searchParams.get(param));
  if (missing.length > 0) {
    return { isValid: false, error: `Missing required booking parameters: ${missing.join(", ")}. ${RESTART}` };
  }

  const carId = Number(searchParams.get("carId"));
  if (!Number.isInteger(carId) || carId <= 0) return { isValid: false, error: `Invalid car ID. ${RESTART}` };

  const branchId = Number(searchParams.get("branchId"));
  if (!Number.isInteger(branchId) || branchId <= 0) return { isValid: false, error: `Invalid branch ID. ${RESTART}` };

  const dailyPrice = Number(searchParams.get("dailyPrice"));
  if (!Number.isFinite(dailyPrice) || dailyPrice <= 0) return { isValid: false, error: `Invalid daily price. ${RESTART}` };

  const startDate = searchParams.get("startDate")!;
  const endDate = searchParams.get("endDate")!;
  if (!isIsoDate(startDate) || !isIsoDate(endDate)) return { isValid: false, error: `Invalid date format. ${RESTART}` };

  // yyyy-mm-dd strings compare like dates; today is the local date (toISOString() would give the UTC date)
  if (startDate < todayString()) return { isValid: false, error: `Start date cannot be in the past. ${RESTART}` };
  if (endDate < startDate) return { isValid: false, error: `End date cannot be before start date. ${RESTART}` };

  return { isValid: true };
}
