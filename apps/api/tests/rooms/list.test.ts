import { describe, expect, it } from 'vitest';

import { useTestApp } from '../helpers/app';
import { roomFactory } from '../factories/room.factory';
import { listRoomResourcesResponseSchema, listRoomsQuerySchema, listRoomsResponseSchema } from '../../src/schemas/room';
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
    expect(listRoomsQuerySchema.parse({ minCapacity: '8' })).toMatchObject({ minCapacity: 8 });
  });

  it('accepts resources comma-separated, repeated or both, normalized', () => {
    expect(listRoomsQuerySchema.parse({ resources: 'Projector, tv,' }).resources).toEqual(['projector', 'tv']);
    expect(listRoomsQuerySchema.parse({ resources: ['tv', 'whiteboard,TV'] }).resources).toEqual(['tv', 'whiteboard']);
  });

  describe('filters', () => {
    const seedRooms = () => ({
      small: roomFactory.create(ctx.db, { name: 'A small', maxCapacity: 4, resources: ['whiteboard'] }),
      medium: roomFactory.create(ctx.db, { name: 'B medium', maxCapacity: 10, resources: ['projector', 'whiteboard'] }),
      large: roomFactory.create(ctx.db, { name: 'C large', maxCapacity: 40, resources: ['projector', 'microphone'] }),
    });
    const list = async (qs: string) => listRoomsResponseSchema.parse((await ctx.api.get(`/rooms/list?${qs}`).expect(200)).body);

    it('by minimum capacity (inclusive)', async () => {
      const { medium, large } = seedRooms();
      const page = await list('minCapacity=10');
      expect(page.data).toEqual([medium, large]);
      expect(page.pagination.totalRecords).toBe(2);
    });

    it('by resource', async () => {
      const { medium, large } = seedRooms();
      expect((await list('resources=projector')).data).toEqual([medium, large]);
    });

    it('by several resources: the room must have all of them', async () => {
      const { medium } = seedRooms();
      expect((await list('resources=projector,whiteboard')).data).toEqual([medium]);
      expect((await list('resources=projector&resources=whiteboard')).data).toEqual([medium]);
    });

    it('resource matching ignores case', async () => {
      const { large } = seedRooms();
      expect((await list('resources=MICROPHONE')).data).toEqual([large]);
    });

    it('combines capacity and resources, and paginates the filtered set', async () => {
      const { large } = seedRooms();
      expect((await list('minCapacity=5&resources=projector&size=1&page=2')).data).toEqual([large]);
      expect((await list('minCapacity=5&resources=projector&size=1')).pagination).toEqual({
        currentPage: 1,
        totalPages: 2,
        totalRecords: 2,
        size: 1,
      });
    });

    it('returns an empty page when nothing matches', async () => {
      seedRooms();
      const page = await list('minCapacity=100');
      expect(page.data).toEqual([]);
      expect(page.pagination.totalRecords).toBe(0);
    });

    it('does not match a resource that is only a prefix of a stored tag', async () => {
      seedRooms();
      expect((await list('resources=project')).data).toEqual([]);
    });
  });

  it.each([
    ['page=0', 'page'],
    ['size=101', 'size'],
    ['size=abc', 'size'],
    ['minCapacity=0', 'minCapacity'],
    ['minCapacity=abc', 'minCapacity'],
    ['minCapacity=2.5', 'minCapacity'],
    [`resources=${'x'.repeat(51)}`, 'resources'],
  ])('returns 400 for %s', async (qs, field) => {
    const res = await ctx.api.get(`/rooms/list?${qs}`).expect(400);
    const error = errorResponseSchema.parse(res.body);
    expect(error.message).toBe('invalid query params');
    expect(error.details).toHaveProperty(field);
  });
});

describe('GET /rooms/resources', () => {
  const ctx = useTestApp();

  it('returns every distinct resource in use, alphabetically', async () => {
    roomFactory.create(ctx.db, { resources: ['tv', 'projector'] });
    roomFactory.create(ctx.db, { resources: ['projector', 'whiteboard'] });
    roomFactory.create(ctx.db, { resources: [] });

    const res = await ctx.api.get('/rooms/resources').expect(200);
    expect(listRoomResourcesResponseSchema.parse(res.body)).toEqual({ data: ['projector', 'tv', 'whiteboard'] });
  });

  it('is empty without rooms', async () => {
    expect((await ctx.api.get('/rooms/resources').expect(200)).body).toEqual({ data: [] });
  });
});
