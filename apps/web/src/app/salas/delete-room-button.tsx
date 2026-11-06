'use client';

import { useActionState } from 'react';

import { deleteRoom, type DeleteRoomState } from './actions';

export function DeleteRoomButton({ roomId, roomName }: { roomId: number; roomName: string }) {
  const [state, action, pending] = useActionState<DeleteRoomState, FormData>(deleteRoom, {});

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(`Excluir a sala ${roomName}? As reservas dela também serão excluídas.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="roomId" value={roomId} />
      <button
        type="submit"
        disabled={pending}
        className="rounded border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
      >
        {pending ? 'Excluindo…' : 'Excluir'}
      </button>
      {state.error && (
        <p role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}
    </form>
  );
}
