import type { IRoom, Pagination } from '@repo/shared-types';

import { api } from '@/lib/api';
import { isDate, today } from '@/lib/datetime';
import { requireUser } from '@/lib/session';
import { ReserveForm } from './reserve-form';

export const metadata = { title: 'Reservar' };

type SearchParams = Record<string, string | string[] | undefined>;

export default async function ReservePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireUser();
  const params = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

  const minDate = today();
  const requestedRoom = Number(first(params.roomId));
  const roomId = Number.isInteger(requestedRoom) && requestedRoom > 0 ? requestedRoom : undefined;
  const requestedDate = first(params.date);
  const date = isDate(requestedDate) ? requestedDate : minDate;
  const reserved = first(params.reservado);

  const { data: rooms } = await api<{ data: IRoom[]; pagination: Pagination }>('/rooms/list', { query: { size: 100 } });
  const room = rooms.find((r) => r.id === roomId);

  return (
    <section className="mx-auto max-w-md">
      <h1 className="mb-4 text-2xl font-semibold">Reservar sala</h1>
      {reserved && (
        <p role="status" className="mb-4 rounded bg-green-50 px-3 py-2 text-sm text-green-800 dark:bg-green-950 dark:text-green-300">
          Reserva confirmada.
        </p>
      )}
      {rooms.length === 0 ? (
        <p className="text-neutral-500">Nenhuma sala cadastrada.</p>
      ) : (
        // key: a new booking resets the form's typed values and errors
        <ReserveForm key={reserved} rooms={rooms} roomId={room?.id} date={date} minDate={minDate} />
      )}
    </section>
  );
}
