import { notFound } from 'next/navigation';
import type { IRoom } from '@repo/shared-types';

import { api, ApiError } from '@/lib/api';
import { requireAdmin } from '@/lib/session';
import { RoomForm } from './room-form';

export const metadata = { title: 'Editar sala' };

export default async function EditRoomPage({ params }: { params: Promise<{ id: string }> }) {
  // regular users get a 404 here, even typing the URL
  await requireAdmin();

  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();

  let room: IRoom;
  try {
    room = await api<IRoom>(`/rooms/find/${id}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  return (
    <section className="mx-auto max-w-md">
      <h1 className="mb-4 text-2xl font-semibold">Editar sala</h1>
      <RoomForm room={room} />
    </section>
  );
}
