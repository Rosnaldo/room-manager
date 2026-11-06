'use server';

import { redirect } from 'next/navigation';
import type { IReservedRoom } from '@repo/shared-types';

import { api, ApiError } from '@/lib/api';
import { isDate, isTime, toLocalDateTime } from '@/lib/datetime';
import { requireUser } from '@/lib/session';

export interface ReserveState {
  error?: string;
  /** what the user typed, so the form keeps it after an error */
  values?: { roomId: string; date: string; start: string; end: string };
}

/**
 * The API sends its errors already translated (Portuguese by default): show them as they come.
 * Validation errors carry the specific problems in `details`; other errors only in `message`.
 */
function messageOf(err: ApiError): string {
  const details = Object.values((err.details ?? {}) as Record<string, string[]>).flat();
  return details.length ? [...new Set(details)].join(' ') : err.message;
}

export async function reserveRoom(_prev: ReserveState, formData: FormData): Promise<ReserveState> {
  const user = await requireUser();
  const values = {
    roomId: String(formData.get('roomId') ?? ''),
    date: String(formData.get('date') ?? ''),
    start: String(formData.get('start') ?? ''),
    end: String(formData.get('end') ?? ''),
  };

  const roomId = Number(values.roomId);
  if (!Number.isInteger(roomId) || roomId <= 0) return { error: 'Escolha uma sala.', values };
  if (!isDate(values.date)) return { error: 'Escolha uma data.', values };
  if (!isTime(values.start) || !isTime(values.end)) return { error: 'Informe o início e o fim.', values };

  try {
    await api<IReservedRoom>('/reservations/create', {
      method: 'POST',
      body: {
        userId: user.id,
        roomId,
        startAt: toLocalDateTime(values.date, values.start),
        endAt: toLocalDateTime(values.date, values.end),
      },
    });
  } catch (err) {
    if (err instanceof ApiError && err.status < 500) return { error: messageOf(err), values };
    throw err;
  }

  // redirect outside try: it works by throwing. A fresh value each time remounts the form (clears old errors).
  redirect(`/reservar?roomId=${roomId}&date=${values.date}&reservado=${Date.now()}`);
}
