import Link from 'next/link';
import type { IRoom, Pagination } from '@repo/shared-types';

import { api } from '@/lib/api';
import { requireUser } from '@/lib/session';
import { DeleteRoomButton } from '@/app/salas/delete-room-button';

type SearchParams = Record<string, string | string[] | undefined>;

interface RoomFilters {
  capacity?: number;
  resources: string[];
  page: number;
}

const PAGE_SIZE = 12;

/** Reads the filters from the URL, dropping anything malformed instead of failing the page. */
function parseFilters(params: SearchParams): RoomFilters {
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const positiveInt = (v: string | undefined) => {
    const n = Number(v);
    return v && Number.isInteger(n) && n >= 1 ? n : undefined;
  };

  const resources = [params.resources ?? []]
    .flat()
    .flatMap((v) => v.split(','))
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);

  return {
    capacity: positiveInt(first(params.capacity)),
    resources: [...new Set(resources)],
    page: positiveInt(first(params.page)) ?? 1,
  };
}

/** Same filters as a query string, so pagination links keep them. */
function toQueryString(filters: RoomFilters): string {
  const qs = new URLSearchParams();
  if (filters.capacity) qs.set('capacity', String(filters.capacity));
  if (filters.resources.length) qs.set('resources', filters.resources.join(','));
  if (filters.page > 1) qs.set('page', String(filters.page));
  const s = qs.toString();
  return s ? `/?${s}` : '/';
}

export default async function HomePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireUser();
  const filters = parseFilters(await searchParams);

  const [{ data: rooms, pagination }, { data: allResources }] = await Promise.all([
    api<{ data: IRoom[]; pagination: Pagination }>('/rooms/list', {
      query: {
        page: filters.page,
        size: PAGE_SIZE,
        capacity: filters.capacity,
        resources: filters.resources.length ? filters.resources.join(',') : undefined,
      },
    }),
    api<{ data: string[] }>('/rooms/resources'),
  ]);

  const isAdmin = user.role === 'admin';
  const hasFilters = filters.capacity !== undefined || filters.resources.length > 0;

  return (
    <section>
      <h1 className="text-2xl font-semibold">Olá, {user.firstName}</h1>
      <p className="mt-2 text-neutral-500">Escolha uma sala para reservar.</p>

      {/* a plain GET form: submitting writes the filters to the URL */}
      <form method="get" className="mt-6 flex flex-wrap items-end gap-6 rounded border border-neutral-200 p-4 dark:border-neutral-800">
        <label className="flex flex-col gap-1 text-sm">
          Capacidade mínima
          <input
            type="number"
            name="capacity"
            min={1}
            defaultValue={filters.capacity}
            placeholder="Qualquer"
            className="w-32 rounded border border-neutral-300 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
          />
        </label>

        {allResources.length > 0 && (
          <fieldset className="flex flex-col gap-1 text-sm">
            <legend className="mb-1">Recursos</legend>
            <div className="flex flex-wrap gap-3">
              {allResources.map((tag) => (
                <label key={tag} className="flex items-center gap-1.5">
                  <input type="checkbox" name="resources" value={tag} defaultChecked={filters.resources.includes(tag)} />
                  {tag}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <div className="flex gap-3">
          <button type="submit" className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Filtrar
          </button>
          {hasFilters && (
            <Link href="/" className="self-center text-sm underline">
              Limpar
            </Link>
          )}
        </div>
      </form>

      {rooms.length === 0 ? (
        <p className="mt-6 text-neutral-500">
          {hasFilters ? 'Nenhuma sala atende a esses filtros.' : 'Nenhuma sala cadastrada.'}
        </p>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <li key={room.id} className="rounded border border-neutral-200 p-4 dark:border-neutral-800">
              <h2 className="font-medium">{room.name}</h2>
              <p className="mt-1 text-sm text-neutral-500">
                {room.maxCapacity} {room.maxCapacity === 1 ? 'pessoa' : 'pessoas'}
              </p>
              {room.resources.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {room.resources.map((tag) => (
                    <li key={tag} className="rounded bg-neutral-100 px-2 py-0.5 text-xs dark:bg-neutral-800">
                      {tag}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-4 flex flex-wrap items-start gap-2">
                <Link
                  href={`/reservar?roomId=${room.id}`}
                  className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Reservar
                </Link>
                {isAdmin && (
                  <>
                    <Link
                      href={`/salas/${room.id}/editar`}
                      className="rounded border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
                    >
                      Editar
                    </Link>
                    <DeleteRoomButton roomId={room.id} roomName={room.name} />
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {pagination.totalPages > 1 && (
        <nav className="mt-6 flex items-center gap-4 text-sm">
          {pagination.currentPage > 1 && (
            <Link href={toQueryString({ ...filters, page: pagination.currentPage - 1 })} className="underline">
              Anterior
            </Link>
          )}
          <span className="text-neutral-500">
            Página {pagination.currentPage} de {pagination.totalPages}
          </span>
          {pagination.currentPage < pagination.totalPages && (
            <Link href={toQueryString({ ...filters, page: pagination.currentPage + 1 })} className="underline">
              Próxima
            </Link>
          )}
        </nav>
      )}
    </section>
  );
}
