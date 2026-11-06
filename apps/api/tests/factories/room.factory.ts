import type { IRoom } from '@repo/shared-types';

import type { NewRoomRow } from '../../src/db/schema';
import { RoomRepository } from '../../src/repositories/room';
import type { CreateRoomBody } from '../../src/controllers/rooms';
import { Factory } from './factory';

/** Persisted room entity. Any column (incl. id) can be overridden. */
export const roomFactory = new Factory<NewRoomRow, IRoom>({
  defaults: (n) => ({ name: `Room ${n}`, resources: ['whiteboard'] }),
  persist: (db, attrs) => new RoomRepository(db).create(attrs),
});

/** Request payloads (not persisted). */
export const createRoomBodyFactory = new Factory<CreateRoomBody>({
  defaults: (n) => ({ name: `New Room ${n}`, resources: ['projector', 'tv'] }),
});
