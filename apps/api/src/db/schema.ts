import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { UserRole } from '@repo/shared-types';

type UserRoleValue = (typeof UserRole)[keyof typeof UserRole];
const roleValues = Object.values(UserRole) as [UserRoleValue, ...UserRoleValue[]];

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').unique(),
  role: text('role', { enum: roleValues }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch('subsec') * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch('subsec') * 1000)`)
    .$onUpdate(() => new Date()),
});

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;

export const rooms = sqliteTable(
  'rooms',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    // max number of people; the default only backfills rows that existed before the column
    maxCapacity: integer('max_capacity').notNull().default(1),
    // JSON array of resource tags, e.g. ["projector","whiteboard"]; queryable via json_each()
    resources: text('resources', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`),
  },
  (t) => [uniqueIndex('rooms_name_unique').on(sql`lower(${t.name})`), index('rooms_max_capacity_idx').on(t.maxCapacity)],
);

export type RoomRow = typeof rooms.$inferSelect;
export type NewRoomRow = typeof rooms.$inferInsert;

export const reservedRooms = sqliteTable(
  'reserved_rooms',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    roomId: integer('room_id')
      .notNull()
      .references(() => rooms.id, { onDelete: 'cascade' }),
    // local wall-clock time 'YYYY-MM-DDTHH:mm:ss': fixed width, so text comparison is chronological
    startAt: text('start_at').notNull(),
    endAt: text('end_at').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch('subsec') * 1000)`),
  },
  (t) => [index('reserved_rooms_room_start_idx').on(t.roomId, t.startAt)],
);

export type ReservedRoomRow = typeof reservedRooms.$inferSelect;
export type NewReservedRoomRow = typeof reservedRooms.$inferInsert;
