import { and, eq, gt, lt, type SQL } from 'drizzle-orm';
import type { IReservedRoom } from '@repo/shared-types';

import type { DB } from '../db/connection';
import { reservedRooms, type NewReservedRoomRow, type ReservedRoomRow } from '../db/schema';

function toReservedRoom(row: ReservedRoomRow): IReservedRoom {
  return { id: row.id, userId: row.userId, roomId: row.roomId, startAt: row.startAt, endAt: row.endAt };
}

/** Two intervals overlap when each starts before the other ends; touching ends (10:00-11:00, 11:00-12:00) do not. */
function overlaps(startAt: string, endAt: string): SQL {
  return and(lt(reservedRooms.startAt, endAt), gt(reservedRooms.endAt, startAt))!;
}

export type CreateReservationResult =
  | { ok: true; reservation: IReservedRoom }
  | { ok: false; conflict: IReservedRoom };

export class ReservedRoomRepository {
  constructor(private readonly db: DB) {}

  findById(id: number): IReservedRoom | undefined {
    const row = this.db.select().from(reservedRooms).where(eq(reservedRooms.id, id)).get();
    return row && toReservedRoom(row);
  }

  /** First reservation of `roomId` that overlaps [startAt, endAt), if any. */
  findOverlap(roomId: number, startAt: string, endAt: string): IReservedRoom | undefined {
    const row = this.db
      .select()
      .from(reservedRooms)
      .where(and(eq(reservedRooms.roomId, roomId), overlaps(startAt, endAt)))
      .orderBy(reservedRooms.startAt)
      .get();
    return row && toReservedRoom(row);
  }

  /** Inserts unless the room is taken. Check and insert run in one transaction, so two requests can't both win. */
  createIfFree(data: NewReservedRoomRow): CreateReservationResult {
    return this.db.transaction((tx) => {
      const repo = new ReservedRoomRepository(tx as unknown as DB);
      const conflict = repo.findOverlap(data.roomId, data.startAt, data.endAt);
      if (conflict) return { ok: false, conflict };
      return { ok: true, reservation: toReservedRoom(tx.insert(reservedRooms).values(data).returning().get()) };
    });
  }
}
