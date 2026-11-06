import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { Header } from '@/components/header';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Room Manager', template: '%s · Room Manager' },
  description: 'Reserva de salas de reunião',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <Header />
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
