'use client';

import { useActionState } from 'react';
import type { IRoom } from '@repo/shared-types';

import { reserveRoom, type ReserveState } from './actions';

const field = 'rounded border border-neutral-300 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900';

/**
 * 24-hour times every 15 minutes (00:00 … 23:45). A <select> instead of <input type="time">, whose
 * AM/PM display follows the browser locale and makes "12:30 AM" (00:30) easy to pick by mistake.
 */
const TIMES = Array.from({ length: 24 * 4 }, (_, i) => {
  const h = String(Math.floor(i / 4)).padStart(2, '0');
  const m = String((i % 4) * 15).padStart(2, '0');
  return `${h}:${m}`;
});

export function ReserveForm({
  rooms,
  roomId,
  date,
  minDate,
}: {
  rooms: IRoom[];
  roomId?: number;
  date: string;
  minDate: string;
}) {
  const [state, action, pending] = useActionState<ReserveState, FormData>(reserveRoom, {});
  const values = state.values;

  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Sala
        <select
          name="roomId"
          required
          defaultValue={values?.roomId ?? roomId ?? ''}
          className={field}
        >
          <option value="" disabled>
            Escolha uma sala
          </option>
          {rooms.map((room) => (
            <option key={room.id} value={room.id}>
              {room.name} ({room.maxCapacity} {room.maxCapacity === 1 ? 'pessoa' : 'pessoas'})
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Data
        <input
          type="date"
          name="date"
          required
          min={minDate}
          defaultValue={values?.date ?? date}
          className={field}
        />
      </label>

      <div className="flex gap-4">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          Início
          <select name="start" required defaultValue={values?.start ?? ''} className={field}>
            <option value="" disabled>
              --:--
            </option>
            {TIMES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm">
          Fim
          <select name="end" required defaultValue={values?.end ?? ''} className={field}>
            <option value="" disabled>
              --:--
            </option>
            {TIMES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="text-xs text-neutral-500">De 15 minutos a 4 horas, sem sobrepor outra reserva da sala.</p>

      {state.error && (
        <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-blue-600 px-3 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? 'Reservando…' : 'Reservar'}
      </button>
    </form>
  );
}
