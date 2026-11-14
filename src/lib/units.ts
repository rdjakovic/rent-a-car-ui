import type { MileageUnit } from "@/lib/api/queries";

const MILEAGE_UNIT_LABELS: Record<MileageUnit, string> = {
  KILOMETERS: "km",
  MILES: "mi",
};

/** Short label for a unit, e.g. "km"; empty while the unit is unknown. */
export function mileageUnitLabel(unit: MileageUnit | undefined): string {
  return unit ? MILEAGE_UNIT_LABELS[unit] : "";
}

/**
 * Formats a mileage value with the configured unit, e.g. "15,000 km".
 * The unit is a label only: values are shown as stored, never converted.
 * Without a known unit (settings not loaded) only the number is shown.
 */
export function formatMileage(value: number | null | undefined, unit: MileageUnit | undefined): string | undefined {
  if (value == null) return undefined;
  const number = value.toLocaleString();
  return unit ? `${number} ${MILEAGE_UNIT_LABELS[unit]}` : number;
}
