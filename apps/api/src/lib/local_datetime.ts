/**
 * Helpers for local wall-clock date-times written as `YYYY-MM-DDTHH:mm:ss` (no timezone).
 * The format is fixed-width, so comparing two of them as strings compares them in time.
 */

export const LOCAL_DATETIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/;

/** Milliseconds of the wall-clock value as if it were UTC, or undefined if it isn't a real date/time. */
export function toWallClockMs(value: string): number | undefined {
  const m = LOCAL_DATETIME_PATTERN.exec(value);
  if (!m) return undefined;
  const [year, month, day, hour, minute, second] = m.slice(1).map(Number);
  const ms = Date.UTC(year, month - 1, day, hour, minute, second);
  const d = new Date(ms);
  // Date.UTC rolls over invalid parts (Feb 30 -> Mar 2, 25:00 -> next day); reject those
  const valid =
    d.getUTCFullYear() === year &&
    d.getUTCMonth() === month - 1 &&
    d.getUTCDate() === day &&
    d.getUTCHours() === hour &&
    d.getUTCMinutes() === minute &&
    d.getUTCSeconds() === second;
  return valid ? ms : undefined;
}

export function isLocalDateTime(value: string): boolean {
  return toWallClockMs(value) !== undefined;
}

/** Whole minutes from `start` to `end` (negative if end is earlier). Both must be valid. */
export function minutesBetween(start: string, end: string): number {
  return (toWallClockMs(end)! - toWallClockMs(start)!) / 60_000;
}

/** The given instant as wall-clock time in `timeZone`, in the same `YYYY-MM-DDTHH:mm:ss` format. */
export function formatInTimeZone(instant: Date, timeZone: string): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(instant)
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
}
