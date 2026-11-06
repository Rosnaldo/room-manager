import type { CreateRoomBody } from '../../controllers/rooms';
import type { CreateUserBody } from '../../controllers/users';

/** Seed users for the "entrar como" selector: 1 admin + 2 regular users. Matched by email. */
export const seedUsers: (CreateUserBody & { email: string })[] = [
  { firstName: 'Andrey', lastName: 'Tsuzuki', email: 'andreytsuzuki@gmail.com', role: 'admin' },
  { firstName: 'Maria', lastName: 'Souza', email: 'maria.souza@example.com', role: 'customer' },
  { firstName: 'João', lastName: 'Lima', email: 'joao.lima@example.com', role: 'customer' },
];

/** Seed rooms. Matched by name (case-insensitive). */
export const seedRooms: CreateRoomBody[] = [
  { name: 'Sala Ipê', maxCapacity: 8, resources: ['projector', 'whiteboard'] },
  { name: 'Sala Jacarandá', maxCapacity: 12, resources: ['tv', 'videoconference'] },
  { name: 'Sala Araucária', maxCapacity: 4, resources: ['whiteboard'] },
  { name: 'Sala Cedro', maxCapacity: 6, resources: ['tv'] },
  { name: 'Auditório Pau-Brasil', maxCapacity: 80, resources: ['projector', 'microphone', 'videoconference'] },
];
