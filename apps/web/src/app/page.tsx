import { requireUser } from '@/lib/session';

export default async function HomePage() {
  const user = await requireUser();

  return (
    <section>
      <h1 className="text-2xl font-semibold">Olá, {user.firstName}</h1>
      <p className="mt-2 text-neutral-500">Escolha uma sala para reservar.</p>
    </section>
  );
}
