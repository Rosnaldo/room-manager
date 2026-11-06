import { count, eq, sql } from 'drizzle-orm';
import type { IRoom, Pagination } from '@repo/shared-types';

import type { DB } from '../db/connection';
import { rooms, type NewRoomRow, type RoomRow } from '../db/schema';

function toRoom(row: RoomRow): IRoom {
  return { id: row.id, name: row.name, resources: row.resources };
}

export interface ListRoomsOptions {
  page: number;
  size: number;
}

export class RoomRepository {
  constructor(private readonly db: DB) {}

  findById(id: number): IRoom | undefined {
    const row = this.db.select().from(rooms).where(eq(rooms.id, id)).get();
    return row && toRoom(row);
  }

  /** Case-insensitive, matching the lower(name) unique index. */
  findByName(name: string): IRoom | undefined {
    const row = this.db.select().from(rooms).where(sql`lower(${rooms.name}) = lower(${name})`).get();
    return row && toRoom(row);
  }

  list(opts: ListRoomsOptions): { data: IRoom[]; pagination: Pagination } {
    const { total } = this.db.select({ total: count() }).from(rooms).get()!;
    const rows = this.db
      .select()
      .from(rooms)
      .orderBy(rooms.name, rooms.id)
      .limit(opts.size)
      .offset((opts.page - 1) * opts.size)
      .all();

    return {
      data: rows.map(toRoom),
      pagination: {
        currentPage: opts.page,
        totalPages: Math.ceil(total / opts.size),
        totalRecords: total,
        size: opts.size,
      },
    };
  }

  create(data: NewRoomRow): IRoom {
    return toRoom(this.db.insert(rooms).values(data).returning().get());
  }

  update(id: number, data: Partial<NewRoomRow>): IRoom | undefined {
    const row = this.db.update(rooms).set(data).where(eq(rooms.id, id)).returning().get();
    return row && toRoom(row);
  }
}
