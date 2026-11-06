'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { SESSION_COOKIE } from '@/lib/session';

export async function signInAs(formData: FormData) {
  const id = Number(formData.get('userId'));
  if (!Number.isInteger(id) || id <= 0) redirect('/login');

  (await cookies()).set(SESSION_COOKIE, String(id), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
  redirect('/');
}

export async function signOut() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect('/login');
}
