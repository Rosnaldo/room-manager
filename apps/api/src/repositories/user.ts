import { count, desc, eq } from 'drizzle-orm';
import type { IUser, Pagination, UserRole } from '@repo/shared-types';

import type { DB } from '../db/connection';
import { users, type NewUserRow, type UserRow } from '../db/schema';

function toUser(row: UserRow): IUser {
  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email ?? undefined,
    role: row.role,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export interface ListUsersOptions {
  page: number;
  size: number;
  role?: keyof typeof UserRole;
}

export class UserRepository {
  constructor(private readonly db: DB) {}

  findById(id: number): IUser | undefined {
    const row = this.db.select().from(users).where(eq(users.id, id)).get();
    return row && toUser(row);
  }

  findByEmail(email: string): IUser | undefined {
    const row = this.db.select().from(users).where(eq(users.email, email)).get();
    return row && toUser(row);
  }

  list(opts: ListUsersOptions): { data: IUser[]; pagination: Pagination } {
    const where = opts.role ? eq(users.role, opts.role) : undefined;

    const { total } = this.db.select({ total: count() }).from(users).where(where).get()!;
    const rows = this.db
      .select()
      .from(users)
      .where(where)
      .orderBy(desc(users.createdAt), desc(users.id))
      .limit(opts.size)
      .offset((opts.page - 1) * opts.size)
      .all();

    return {
      data: rows.map(toUser),
      pagination: {
        currentPage: opts.page,
        totalPages: Math.ceil(total / opts.size),
        totalRecords: total,
        size: opts.size,
      },
    };
  }

  create(data: NewUserRow): IUser {
    return toUser(this.db.insert(users).values(data).returning().get());
  }

  update(id: number, data: Partial<NewUserRow>): IUser | undefined {
    const row = this.db.update(users).set(data).where(eq(users.id, id)).returning().get();
    return row && toUser(row);
  }

  delete(id: number): boolean {
    return this.db.delete(users).where(eq(users.id, id)).run().changes > 0;
  }
}
