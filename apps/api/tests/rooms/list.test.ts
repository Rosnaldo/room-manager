import { describe, expect, it } from 'vitest';

import { useTestApp } from '../helpers/app';
import { roomFactory } from '../factories/room.factory';
import { listRoomsQuerySchema, listRoomsResponseSchema } from '../../src/schemas/room';
import { errorResponseSchema } from '../../src/schemas/common';

describe('GET /rooms/list', () => {
  const ctx = useTestApp();

  it('returns an empty page on an empty database', async () => {
    const res = await ctx.api.get('/rooms/list').expect(200);
    expect(listRoomsResponseSchema.parse(res.body)).toEqual({
      data: [],
      pagination: { currentPage: 1, totalPages: 0, totalRecords: 0, size: 20 },
    });
  });

  it('lists rooms ordered by name and paginates', async () => {
    const charlie = roomFactory.create(ctx.db, { name: 'Charlie' });
    const alpha = roomFactory.create(ctx.db, { name: 'Alpha', resources: ['projector', 'tv'] });
    const bravo = roomFactory.create(ctx.db, { name: 'Bravo', resources: [] });

    const page1 = listRoomsResponseSchema.parse((await ctx.api.get('/rooms/list?size=2').expect(200)).body);
    expect(page1.data).toEqual([alpha, bravo]);
    expect(page1.pagination).toEqual({ currentPage: 1, totalPages: 2, totalRecords: 3, size: 2 });

    const page2 = listRoomsResponseSchema.parse((await ctx.api.get('/rooms/list?size=2&page=2').expect(200)).body);
    expect(page2.data).toEqual([charlie]);
  });

  it('coerces and defaults query params', () => {
    expect(listRoomsQuerySchema.parse({})).toEqual({ page: 1, size: 20 });
    expect(listRoomsQuerySchema.parse({ page: '2', size: '10' })).toEqual({ page: 2, size: 10 });
  });

  it.each([
    ['page=0', 'page'],
    ['size=101', 'size'],
    ['size=abc', 'size'],
  ])('returns 400 for %s', async (qs, field) => {
    const res = await ctx.api.get(`/rooms/list?${qs}`).expect(400);
    const error = errorResponseSchema.parse(res.body);
    expect(error.message).toBe('invalid query params');
    expect(error.details).toHaveProperty(field);
  });
});
