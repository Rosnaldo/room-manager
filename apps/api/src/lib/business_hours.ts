/**
 * Reservations happen on weekdays (Monday to Friday), from 08:00 to 20:00, local time.
 * Times are `YYYY-MM-DDTHH:mm:ss` wall-clock strings, so the checks are plain string comparisons.
 */

export const OPENING_TIME = '08:00:00';
export const CLOSING_TIME = '20:00:00';

const dateOf = (v: string) => v.slice(0, 10);
const timeOf = (v: string) => v.slice(11);

/** Monday to Friday. The date is a calendar day, so the weekday doesn't depend on any timezone. */
export function isWeekday(localDateTime: string): boolean {
  const day = new Date(`${dateOf(localDateTime)}T00:00:00Z`).getUTCDay(); // 0 = Sunday … 6 = Saturday
  return day >= 1 && day <= 5;
}

export function startsWithinHours(startAt: string): boolean {
  return timeOf(startAt) >= OPENING_TIME && timeOf(startAt) < CLOSING_TIME;
}

/** Ends by 20:00 on the day it started (a booking can't run past closing or into the next day). */
export function endsWithinHours(startAt: string, endAt: string): boolean {
  return dateOf(endAt) === dateOf(startAt) && timeOf(endAt) <= CLOSING_TIME;
}
