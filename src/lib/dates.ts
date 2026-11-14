const pad = (n: number) => String(n).padStart(2, "0");

/** A date as yyyy-mm-dd in local time (the date inputs and the API work in local dates). */
export function toDateString(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Today as yyyy-mm-dd in local time. */
export function todayString() {
  return toDateString(new Date());
}

/** Today plus the given number of days (negative for the past) as yyyy-mm-dd. */
export function daysFromToday(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toDateString(date);
}
