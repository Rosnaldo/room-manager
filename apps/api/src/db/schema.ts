import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
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
    // JSON array of resource tags, e.g. ["projector","whiteboard"]; queryable via json_each()
    resources: text('resources', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`),
  },
  (t) => [uniqueIndex('rooms_name_unique').on(sql`lower(${t.name})`)],
);

export type RoomRow = typeof rooms.$inferSelect;
export type NewRoomRow = typeof rooms.$inferInsert;
