import { describe, expect, it } from 'vitest';

import { createTestDb } from './helpers/db';
import { seed } from '../src/db/seed';
import { UserRepository } from '../src/repositories/user';
import { RoomRepository } from '../src/repositories/room';
import { userResponseSchema } from '../src/schemas/user';
import { roomResponseSchema } from '../src/schemas/room';

describe('seed', () => {
  it('creates at least 5 rooms, 2 regular users and 1 admin (challenge requirement)', () => {
    const db = createTestDb();

    expect(seed(db)).toEqual({ users: { created: 3, updated: 0 }, rooms: { created: 5, updated: 0 } });

    const users = new UserRepository(db).list({ page: 1, size: 100 }).data;
    expect(users.filter((u) => u.role === 'admin')).toHaveLength(1);
    expect(users.filter((u) => u.role === 'customer')).toHaveLength(2);

    const rooms = new RoomRepository(db).list({ page: 1, size: 100 }).data;
    expect(rooms).toHaveLength(5);
    rooms.forEach((r) => expect(r.capacity).toBeGreaterThan(0));

    // seeded rows satisfy the same output contracts as API-created ones
    users.forEach((u) => userResponseSchema.parse(JSON.parse(JSON.stringify(u))));
    rooms.forEach((r) => roomResponseSchema.parse(r));
  });

  it('is idempotent: running it again updates instead of duplicating', () => {
    const db = createTestDb();
    seed(db);

    expect(seed(db)).toEqual({ users: { created: 0, updated: 3 }, rooms: { created: 0, updated: 5 } });
    expect(new UserRepository(db).list({ page: 1, size: 100 }).pagination.totalRecords).toBe(3);
    expect(new RoomRepository(db).list({ page: 1, size: 100 }).pagination.totalRecords).toBe(5);
  });
});
