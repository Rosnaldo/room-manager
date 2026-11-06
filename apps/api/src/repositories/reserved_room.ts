import { and, count, eq, gt, lt, sql, type SQL } from 'drizzle-orm';
import type { IReservedRoom, Pagination } from '@repo/shared-types';

import type { DB } from '../db/connection';
import { reservedRooms, type NewReservedRoomRow, type ReservedRoomRow } from '../db/schema';

function toReservedRoom(row: ReservedRoomRow): IReservedRoom {
  return { id: row.id, userId: row.userId, roomId: row.roomId, startAt: row.startAt, endAt: row.endAt };
}

/** Two intervals overlap when each starts before the other ends; touching ends (10:00-11:00, 11:00-12:00) do not. */
function overlaps(startAt: string, endAt: string): SQL {
  return and(lt(reservedRooms.startAt, endAt), gt(reservedRooms.endAt, startAt))!;
}

export interface ListUserReservationsOptions {
  userId: number;
  page: number;
  size: number;
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

  /** One user's reservations, in chronological order (by start, then id). */
  listByUser(opts: ListUserReservationsOptions): { data: IReservedRoom[]; pagination: Pagination } {
    const where = eq(reservedRooms.userId, opts.userId);
    const { total } = this.db.select({ total: count() }).from(reservedRooms).where(where).get()!;
    const rows = this.db
      .select()
      .from(reservedRooms)
      .where(where)
      .orderBy(reservedRooms.startAt, reservedRooms.id)
      .limit(opts.size)
      .offset((opts.page - 1) * opts.size)
      .all();

    return {
      data: rows.map(toReservedRoom),
      pagination: {
        currentPage: opts.page,
        totalPages: Math.ceil(total / opts.size),
        totalRecords: total,
        size: opts.size,
      },
    };
  }

  /**
   * How many of the room's reservations that end after `endAfter` last longer than `minutes`.
   * Used to stop a room's maxDuration from going below a booking it already holds.
   */
  countLongerThan(roomId: number, minutes: number, endAfter: string): number {
    // julianday() reads 'YYYY-MM-DDTHH:mm:ss'; the difference is in days
    const duration = sql`round((julianday(${reservedRooms.endAt}) - julianday(${reservedRooms.startAt})) * 1440)`;
    return this.db
      .select({ n: count() })
      .from(reservedRooms)
      .where(and(eq(reservedRooms.roomId, roomId), gt(reservedRooms.endAt, endAfter), gt(duration, minutes)))
      .get()!.n;
  }

  /** @returns whether a reservation was deleted */
  delete(id: number): boolean {
    return this.db.delete(reservedRooms).where(eq(reservedRooms.id, id)).run().changes > 0;
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
