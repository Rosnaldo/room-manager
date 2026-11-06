'use client';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section>
      <h1 className="text-2xl font-semibold">Algo deu errado</h1>
      <p className="mt-2 text-neutral-500">{error.digest ? `Código: ${error.digest}` : error.message}</p>
      <button type="button" onClick={reset} className="mt-4 underline">
        Tentar novamente
      </button>
    </section>
  );
}
