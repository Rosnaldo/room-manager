import type { IReservedRoom } from '@repo/shared-types';

import type { NewReservedRoomRow } from '../../src/db/schema';
import { ReservedRoomRepository } from '../../src/repositories/reserved_room';
import type { CreateReservedRoomBody } from '../../src/controllers/reserved_rooms';
import { Factory } from './factory';

/**
 * Persisted reservation. userId and roomId have no sensible default: pass real ones.
 * Inserts directly, so it can also create rows the API would reject (e.g. in the past).
 */
export const reservedRoomFactory = new Factory<NewReservedRoomRow, IReservedRoom>({
  defaults: () => ({ userId: 0, roomId: 0, startAt: '2030-01-21T10:00:00', endAt: '2030-01-21T11:00:00' }),
  persist: (db, attrs) => {
    const result = new ReservedRoomRepository(db).createIfFree(attrs);
    if (!result.ok) throw new Error('reservedRoomFactory: slot already taken');
    return result.reservation;
  },
});

/** Request payloads (not persisted). */
export const createReservedRoomBodyFactory = new Factory<CreateReservedRoomBody>({
  defaults: () => ({ userId: 0, roomId: 0, startAt: '2030-01-21T10:00:00', endAt: '2030-01-21T11:00:00' }),
});
