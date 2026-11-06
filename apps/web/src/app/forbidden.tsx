import Link from 'next/link';

export default function Forbidden() {
  return (
    <section>
      <h1 className="text-2xl font-semibold">403 · Acesso negado</h1>
      <p className="mt-2 text-neutral-500">Você não tem permissão para acessar esta página.</p>
      <Link href="/" className="mt-4 inline-block underline">
        Voltar ao início
      </Link>
    </section>
  );
}
