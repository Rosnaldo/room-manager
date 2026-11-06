/** Timezone the reservation times are in. Must match the API's APP_TIMEZONE. */
export const TIME_ZONE = process.env.APP_TIMEZONE ?? 'America/Sao_Paulo';

/** Today in TIME_ZONE as `YYYY-MM-DD`. */
export function today(now: Date = new Date()): string {
  // en-CA formats dates as YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function isDate(value: string | undefined): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

/** `HH:mm` (what the time selects send) or `HH:mm:ss`. */
export function isTime(value: string | undefined): value is string {
  return !!value && /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(value);
}

/** Date + time inputs to the API's `YYYY-MM-DDTHH:mm:ss`. */
export function toLocalDateTime(date: string, time: string): string {
  return `${date}T${time.length === 5 ? `${time}:00` : time}`;
}

/** Current wall-clock time in TIME_ZONE, in the reservations' `YYYY-MM-DDTHH:mm:ss` format. */
export function nowLocal(now: Date = new Date()): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
}

/** `YYYY-MM-DDTHH:mm:ss` → `HH:mm`, for display. */
export function timeOf(localDateTime: string): string {
  return localDateTime.slice(11, 16);
}

/** `YYYY-MM-DD…` → `DD/MM/YYYY`, for display. */
export function formatDate(date: string): string {
  const [y, m, d] = date.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

/** A room's `HH:mm` maxDuration as a label: "04:00" → "4h", "01:30" → "1h30min", "00:45" → "45min". */
export function formatDuration(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  if (!h) return `${m}min`;
  return m ? `${h}h${String(m).padStart(2, '0')}min` : `${h}h`;
}
