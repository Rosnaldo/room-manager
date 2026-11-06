import type { ReactNode } from 'react';

import { requireAdmin } from '@/lib/session';

// Guards every route under /admin on the server, including direct URL access.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin();
  return children;
}
