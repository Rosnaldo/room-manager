import { describe, expect, it } from 'vitest';

import { useTestApp } from '../helpers/app';
import { adminFactory, userFactory } from '../factories/user.factory';
import { listUsersQuerySchema, listUsersResponseSchema } from '../../src/schemas/user';
import { errorResponseSchema } from '../../src/schemas/common';

describe('GET /users/list', () => {
  const ctx = useTestApp();

  it('returns an empty page on an empty database', async () => {
    const res = await ctx.api.get('/users/list').expect(200);
    expect(listUsersResponseSchema.parse(res.body)).toEqual({
      data: [],
      pagination: { currentPage: 1, totalPages: 0, totalRecords: 0, size: 20 },
    });
  });

  it('lists newest first and paginates', async () => {
    const base = Date.UTC(2026, 0, 1);
    const [oldest, middle, newest] = [0, 1, 2].map((i) => userFactory.create(ctx.db, { createdAt: new Date(base + i * 1000) }));

    const page1 = listUsersResponseSchema.parse((await ctx.api.get('/users/list?size=2').expect(200)).body);
    expect(page1.data.map((u) => u.id)).toEqual([newest.id, middle.id]);
    expect(page1.pagination).toEqual({ currentPage: 1, totalPages: 2, totalRecords: 3, size: 2 });

    const page2 = listUsersResponseSchema.parse((await ctx.api.get('/users/list?size=2&page=2').expect(200)).body);
    expect(page2.data).toEqual([oldest]);
  });

  it('filters by role', async () => {
    userFactory.createMany(ctx.db, 3);
    const admin = adminFactory.create(ctx.db);

    const res = listUsersResponseSchema.parse((await ctx.api.get('/users/list?role=admin').expect(200)).body);
    expect(res.data).toEqual([admin]);
    expect(res.pagination.totalRecords).toBe(1);
  });

  it('coerces and defaults query params', () => {
    expect(listUsersQuerySchema.parse({})).toEqual({ page: 1, size: 20 });
    expect(listUsersQuerySchema.parse({ page: '3', size: '5', role: 'customer' })).toEqual({ page: 3, size: 5, role: 'customer' });
  });

  it.each([
    ['page=0', 'page'],
    ['size=101', 'size'],
    ['size=abc', 'size'],
    ['role=boss', 'role'],
  ])('returns 400 for %s', async (qs, field) => {
    const res = await ctx.api.get(`/users/list?${qs}`).expect(400);
    const error = errorResponseSchema.parse(res.body);
    expect(error.message).toBe('invalid query params');
    expect(error.details).toHaveProperty(field);
  });
});
