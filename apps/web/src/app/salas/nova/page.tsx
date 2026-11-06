import { requireAdmin } from '@/lib/session';
import { RoomForm } from '../room-form';

export const metadata = { title: 'Nova sala' };

export default async function NewRoomPage() {
  // regular users get a 404 here, even typing the URL
  await requireAdmin();

  return (
    <section className="mx-auto max-w-md">
      <h1 className="mb-4 text-2xl font-semibold">Nova sala</h1>
      <RoomForm />
    </section>
  );
}
