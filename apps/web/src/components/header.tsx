import Link from 'next/link';

import { getCurrentUser } from '@/lib/session';
import { signOut } from '@/app/login/actions';

export async function Header() {
  const user = await getCurrentUser();

  return (
    <header className="border-b border-neutral-200 dark:border-neutral-800">
      <nav className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
        <Link href="/" className="font-semibold">
          Room Manager
        </Link>
        {user && <Link href="/minhas-reservas">Minhas reservas</Link>}
        <div className="ml-auto flex items-center gap-3 text-sm">
          {user ? (
            <>
              <span>
                {user.firstName} <span className="text-neutral-500">({user.role})</span>
              </span>
              <form action={signOut}>
                <button type="submit" className="underline">
                  Sair
                </button>
              </form>
            </>
          ) : (
            <Link href="/login" className="underline">
              Entrar
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
