import 'server-only';

import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { IUser } from '@repo/shared-types';

import { api, ApiError } from './api';

export const SESSION_COOKIE = 'rm_user_id';

/**
 * Resolves the "entrar como" user from the cookie and re-validates it against
 * the API on every request, so a tampered cookie can't grant a role.
 */
export const getCurrentUser = cache(async (): Promise<IUser | null> => {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  const id = Number(raw);
  if (!raw || !Number.isInteger(id) || id <= 0) return null;

  try {
    return await api<IUser>(`/users/find/${id}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
});

export async function requireUser(): Promise<IUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}
