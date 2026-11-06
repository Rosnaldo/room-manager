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
