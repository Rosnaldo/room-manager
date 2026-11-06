/** Durations written as `HH:mm` (hours 00–23, minutes 00–59), e.g. "04:00" = 4 h, "01:30" = 1 h 30. */

export const DURATION_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Minutes in an `HH:mm` duration, or undefined if it isn't one. */
export function durationToMinutes(value: string): number | undefined {
  const m = DURATION_PATTERN.exec(value);
  return m ? Number(m[1]) * 60 + Number(m[2]) : undefined;
}

/** Short, language-neutral label for messages: 240 → "4h", 90 → "1h30min", 45 → "45min". */
export function formatMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}min`;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}min`;
}
