import Link from 'next/link';

export default function NotFound() {
  return (
    <section>
      <h1 className="text-2xl font-semibold">404 · Página não encontrada</h1>
      <Link href="/" className="mt-4 inline-block underline">
        Voltar ao início
      </Link>
    </section>
  );
}
