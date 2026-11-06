'use server';

import { revalidatePath } from 'next/cache';

import { api, ApiError } from '@/lib/api';
import { requireUser } from '@/lib/session';

export interface CancelState {
  error?: string;
}

/** Cancels as the signed-in user; the API checks that it's theirs. */
export async function cancelReservation(_prev: CancelState, formData: FormData): Promise<CancelState> {
  const user = await requireUser();
  const id = Number(formData.get('reservationId'));
  if (!Number.isInteger(id) || id <= 0) return { error: 'Reserva inválida.' };

  try {
    await api<void>(`/reservations/delete/${id}`, { method: 'DELETE', userId: user.id });
  } catch (err) {
    // the API sends its message already translated
    if (err instanceof ApiError && err.status < 500) return { error: err.message };
    throw err;
  }

  revalidatePath('/minhas-reservas');
  return {};
}
