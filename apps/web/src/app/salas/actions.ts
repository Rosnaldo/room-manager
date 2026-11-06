'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { IRoom } from '@repo/shared-types';

import { api, ApiError } from '@/lib/api';
import { requireAdmin } from '@/lib/session';

export interface RoomFormState {
  error?: string;
  values?: { name: string; maxCapacity: string; resources: string };
}

/** The API sends its errors already translated: show the specific problems if any, else the message. */
function messageOf(err: ApiError): string {
  const details = Object.values((err.details ?? {}) as Record<string, string[]>).flat();
  return details.length ? [...new Set(details)].join(' ') : err.message;
}

export async function updateRoom(roomId: number, _prev: RoomFormState, formData: FormData): Promise<RoomFormState> {
  const admin = await requireAdmin();
  const values = {
    name: String(formData.get('name') ?? ''),
    maxCapacity: String(formData.get('maxCapacity') ?? ''),
    resources: String(formData.get('resources') ?? ''),
  };

  try {
    await api<IRoom>(`/rooms/edit/${roomId}`, {
      method: 'PATCH',
      body: {
        userId: admin.id,
        name: values.name,
        // sent as typed: the API validates it and explains what's wrong
        maxCapacity: values.maxCapacity.trim() === '' ? undefined : Number(values.maxCapacity),
        resources: values.resources.split(',').map((r) => r.trim()).filter(Boolean),
      },
    });
  } catch (err) {
    if (err instanceof ApiError && err.status < 500) return { error: messageOf(err), values };
    throw err;
  }

  revalidatePath('/');
  redirect('/');
}

export interface DeleteRoomState {
  error?: string;
}

export async function deleteRoom(_prev: DeleteRoomState, formData: FormData): Promise<DeleteRoomState> {
  const admin = await requireAdmin();
  const id = Number(formData.get('roomId'));

  try {
    await api<void>(`/rooms/delete/${id}`, { method: 'DELETE', body: { userId: admin.id } });
  } catch (err) {
    if (err instanceof ApiError && err.status < 500) return { error: messageOf(err) };
    throw err;
  }

  revalidatePath('/');
  return {};
}
