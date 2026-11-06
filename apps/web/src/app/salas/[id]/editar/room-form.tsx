'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import type { IRoom } from '@repo/shared-types';

import { updateRoom, type RoomFormState } from '../../actions';

const field = 'rounded border border-neutral-300 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900';

export function RoomForm({ room }: { room: IRoom }) {
  const [state, action, pending] = useActionState<RoomFormState, FormData>(updateRoom.bind(null, room.id), {});
  const values = state.values ?? {
    name: room.name,
    maxCapacity: String(room.maxCapacity),
    resources: room.resources.join(', '),
  };

  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Nome
        <input name="name" required defaultValue={values.name} className={field} />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Capacidade máxima (pessoas)
        <input type="number" name="maxCapacity" required min={1} defaultValue={values.maxCapacity} className={field} />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Recursos
        <input name="resources" defaultValue={values.resources} placeholder="projector, whiteboard" className={field} />
        <span className="text-xs text-neutral-500">Separados por vírgula.</span>
      </label>

      {state.error && (
        <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-blue-600 px-3 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {pending ? 'Salvando…' : 'Salvar'}
        </button>
        <Link href="/" className="text-sm underline">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
