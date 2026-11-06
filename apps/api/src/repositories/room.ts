import { and, asc, count, eq, gte, sql, type SQL } from 'drizzle-orm';
import type { IRoom, Pagination } from '@repo/shared-types';

import type { DB } from '../db/connection';
import { rooms, type NewRoomRow, type RoomRow } from '../db/schema';

function toRoom(row: RoomRow): IRoom {
  return { id: row.id, name: row.name, maxCapacity: row.maxCapacity, resources: row.resources };
}

export interface ListRoomsOptions {
  page: number;
  size: number;
  /** rooms whose maxCapacity is at least this many people */
  capacity?: number;
  /** rooms having every one of these resource tags */
  resources?: string[];
}

function listFilter(opts: ListRoomsOptions): SQL | undefined {
  return and(
    opts.capacity !== undefined ? gte(rooms.maxCapacity, opts.capacity) : undefined,
    ...(opts.resources ?? []).map(
      (tag) => sql`exists (select 1 from json_each(${rooms.resources}) where json_each.value = ${tag})`,
    ),
  );
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
    const where = listFilter(opts);
    const { total } = this.db.select({ total: count() }).from(rooms).where(where).get()!;
    const rows = this.db
      .select()
      .from(rooms)
      .where(where)
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

  /** Every distinct resource tag in use, alphabetically (feeds the list filter). */
  listResources(): string[] {
    return this.db
      .select({ tag: sql<string>`json_each.value` })
      .from(sql`${rooms}, json_each(${rooms.resources})`)
      .groupBy(sql`json_each.value`)
      .orderBy(asc(sql`json_each.value`))
      .all()
      .map((r) => r.tag);
  }

  create(data: NewRoomRow): IRoom {
    return toRoom(this.db.insert(rooms).values(data).returning().get());
  }

  update(id: number, data: Partial<NewRoomRow>): IRoom | undefined {
    const row = this.db.update(rooms).set(data).where(eq(rooms.id, id)).returning().get();
    return row && toRoom(row);
  }

  /** Its reservations go with it (ON DELETE CASCADE). @returns whether a room was deleted */
  delete(id: number): boolean {
    return this.db.delete(rooms).where(eq(rooms.id, id)).run().changes > 0;
  }
}
