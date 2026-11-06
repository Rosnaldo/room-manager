import type { DB } from '../connection';
import { UserRepository } from '../../repositories/user';
import { RoomRepository } from '../../repositories/room';
import { seedRooms, seedUsers } from './data';

export interface SeedResult {
  users: { created: number; updated: number };
  rooms: { created: number; updated: number };
}

/** Idempotent upsert of the seed data: safe to run any number of times. Runs in one transaction. */
export function seed(db: DB): SeedResult {
  return db.transaction((tx) => {
    const result: SeedResult = { users: { created: 0, updated: 0 }, rooms: { created: 0, updated: 0 } };
    const users = new UserRepository(tx as unknown as DB);
    const rooms = new RoomRepository(tx as unknown as DB);

    for (const u of seedUsers) {
      const existing = users.findByEmail(u.email);
      if (existing) {
        users.update(existing.id, u);
        result.users.updated++;
      } else {
        users.create(u);
        result.users.created++;
      }
    }

    for (const r of seedRooms) {
      const existing = rooms.findByName(r.name);
      if (existing) {
        rooms.update(existing.id, r);
        result.rooms.updated++;
      } else {
        rooms.create(r);
        result.rooms.created++;
      }
    }

    return result;
  });
}
