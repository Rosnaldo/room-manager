import Link from 'next/link';
import type { IReservedRoom, IRoom, Pagination } from '@repo/shared-types';

import { api } from '@/lib/api';
import { formatDate, nowLocal, timeOf } from '@/lib/datetime';
import { requireUser } from '@/lib/session';
import { CancelButton } from './cancel-button';

export const metadata = { title: 'Minhas reservas' };

const PAGE_SIZE = 20;

type SearchParams = Record<string, string | string[] | undefined>;

export default async function MyReservationsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireUser();
  const rawPage = (await searchParams).page;
  const requested = Number(Array.isArray(rawPage) ? rawPage[0] : rawPage);
  const page = Number.isInteger(requested) && requested >= 1 ? requested : 1;

  // the API identifies the caller by X-User-Id and returns only their reservations, oldest first
  const [{ data: reservations, pagination }, { data: rooms }] = await Promise.all([
    api<{ data: IReservedRoom[]; pagination: Pagination }>('/reservations/list', {
      query: { page, size: PAGE_SIZE },
      userId: user.id,
    }),
    api<{ data: IRoom[]; pagination: Pagination }>('/rooms/list', { query: { size: 100 } }),
  ]);
  const roomName = new Map(rooms.map((r) => [r.id, r.name]));
  const now = nowLocal();

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Minhas reservas</h1>
        <Link href="/" className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
          Nova reserva
        </Link>
      </div>

      {reservations.length === 0 ? (
        <p className="mt-6 text-neutral-500">Você ainda não tem reservas.</p>
      ) : (
        <ol className="mt-6 flex flex-col gap-2">
          {reservations.map((r) => {
            const ended = r.endAt <= now;
            const sameDay = r.startAt.slice(0, 10) === r.endAt.slice(0, 10);
            const period = `${timeOf(r.startAt)} – ${sameDay ? timeOf(r.endAt) : `${formatDate(r.endAt)} ${timeOf(r.endAt)}`}`;
            const room = roomName.get(r.roomId) ?? `Sala ${r.roomId}`;
            return (
              <li
                key={r.id}
                className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded border border-neutral-200 px-4 py-3 dark:border-neutral-800"
              >
                <span className={`w-24 font-medium ${ended ? 'text-neutral-400' : ''}`}>{formatDate(r.startAt)}</span>
                <span className={`w-36 ${ended ? 'text-neutral-400' : ''}`}>{period}</span>
                <span className={`flex-1 ${ended ? 'text-neutral-400' : ''}`}>{room}</span>
                {ended ? (
                  <span className="text-xs text-neutral-500">encerrada</span>
                ) : (
                  <CancelButton reservationId={r.id} label={`${room}, ${formatDate(r.startAt)} ${period}`} />
                )}
              </li>
            );
          })}
        </ol>
      )}

      {pagination.totalPages > 1 && (
        <nav className="mt-6 flex items-center gap-4 text-sm">
          {pagination.currentPage > 1 && (
            <Link href={`/minhas-reservas?page=${pagination.currentPage - 1}`} className="underline">
              Anterior
            </Link>
          )}
          <span className="text-neutral-500">
            Página {pagination.currentPage} de {pagination.totalPages}
          </span>
          {pagination.currentPage < pagination.totalPages && (
            <Link href={`/minhas-reservas?page=${pagination.currentPage + 1}`} className="underline">
              Próxima
            </Link>
          )}
        </nav>
      )}
    </section>
  );
}
