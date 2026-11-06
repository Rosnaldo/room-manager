'use client';

import { useActionState } from 'react';

import { cancelReservation, type CancelState } from './actions';

export function CancelButton({ reservationId, label }: { reservationId: number; label: string }) {
  const [state, action, pending] = useActionState<CancelState, FormData>(cancelReservation, {});

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(`Cancelar a reserva ${label}?`)) e.preventDefault();
      }}
      className="flex items-center gap-3"
    >
      <input type="hidden" name="reservationId" value={reservationId} />
      {state.error && (
        <span role="alert" className="text-xs text-red-600 dark:text-red-400">
          {state.error}
        </span>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded border border-red-300 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-60 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
      >
        {pending ? 'Cancelando…' : 'Cancelar'}
      </button>
    </form>
  );
}
