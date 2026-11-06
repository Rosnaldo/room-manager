import type { IRoom } from '@repo/shared-types';

import type { NewRoomRow } from '../../src/db/schema';
import { RoomRepository } from '../../src/repositories/room';
import type { CreateRoomBody } from '../../src/controllers/rooms';
import { Factory } from './factory';

/** Persisted room entity. Any column (incl. id) can be overridden. */
export const roomFactory = new Factory<NewRoomRow, IRoom>({
  defaults: (n) => ({ name: `Room ${n}`, maxCapacity: 6, resources: ['whiteboard'] }),
  persist: (db, attrs) => new RoomRepository(db).create(attrs),
});

/** Request payloads (not persisted). userId has no sensible default: pass the caller's. */
export const createRoomBodyFactory = new Factory<CreateRoomBody>({
  defaults: (n) => ({ userId: 0, name: `New Room ${n}`, maxCapacity: 10, resources: ['projector', 'tv'] }),
});
