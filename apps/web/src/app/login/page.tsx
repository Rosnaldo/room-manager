import type { IUser, Pagination } from '@repo/shared-types';

import { api } from '@/lib/api';
import { getCurrentUser } from '@/lib/session';
import { signInAs } from './actions';

export const metadata = { title: 'Entrar' };

export default async function LoginPage() {
  const [{ data: users }, current] = await Promise.all([
    api<{ data: IUser[]; pagination: Pagination }>('/users/list', { query: { size: 100 } }),
    getCurrentUser(),
  ]);

  return (
    <section className="mx-auto max-w-sm">
      <h1 className="mb-4 text-2xl font-semibold">Entrar como</h1>
      {users.length === 0 ? (
        <p className="text-neutral-500">Nenhum usuário cadastrado. Rode o seed da API.</p>
      ) : (
        <form action={signInAs} className="flex flex-col gap-3">
          <select
            name="userId"
            defaultValue={current?.id}
            required
            className="rounded border border-neutral-300 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.firstName} {u.lastName} ({u.role})
              </option>
            ))}
          </select>
          <button type="submit" className="rounded bg-blue-600 px-3 py-2 font-medium text-white hover:bg-blue-700">
            Entrar
          </button>
        </form>
      )}
    </section>
  );
}
