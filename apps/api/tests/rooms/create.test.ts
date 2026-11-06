import { describe, expect, it } from 'vitest';

import { useTestApp } from '../helpers/app';
import { createRoomBodyFactory, roomFactory } from '../factories/room.factory';
import { createRoomBodySchema, roomResponseSchema } from '../../src/schemas/room';
import { errorResponseSchema } from '../../src/schemas/common';
import { RoomRepository } from '../../src/repositories/room';

describe('POST /rooms/create', () => {
  const ctx = useTestApp();

  it('creates a room and returns a body matching the response schema', async () => {
    const body = createRoomBodyFactory.build();
    expect(createRoomBodySchema.safeParse(body).success).toBe(true);

    const res = await ctx.api.post('/rooms/create').send(body).expect(201);

    const room = roomResponseSchema.parse(res.body);
    expect(room).toEqual({ id: expect.any(Number), name: body.name, maxCapacity: body.maxCapacity, resources: body.resources });
    expect(new RoomRepository(ctx.db).findById(room.id)).toEqual(room);
  });

  it('normalizes resources: trims, lowercases and de-duplicates', async () => {
    const body = createRoomBodyFactory.build({ name: '  Sala Azul ', resources: [' Projector', 'TV', 'projector ', 'tv'] });

    const room = roomResponseSchema.parse((await ctx.api.post('/rooms/create').send(body).expect(201)).body);

    expect(room).toMatchObject({ name: 'Sala Azul', resources: ['projector', 'tv'] });
  });

  it('defaults resources to an empty array', async () => {
    const res = await ctx.api.post('/rooms/create').send({ name: 'Bare', maxCapacity: 2 }).expect(201);
    expect(roomResponseSchema.parse(res.body).resources).toEqual([]);
  });

  it('returns 409 for a duplicate name, ignoring case', async () => {
    roomFactory.create(ctx.db, { name: 'Sala Azul' });

    const res = await ctx.api.post('/rooms/create').send(createRoomBodyFactory.build({ name: 'SALA AZUL' })).expect(409);
    expect(errorResponseSchema.parse(res.body).message).toMatch(/already exists/);
  });

  it.each([
    ['missing name', { name: undefined }, 'name'],
    ['blank name', { name: '   ' }, 'name'],
    ['name too long', { name: 'x'.repeat(101) }, 'name'],
    ['missing capacity', { maxCapacity: undefined }, 'maxCapacity'],
    ['zero capacity', { maxCapacity: 0 }, 'maxCapacity'],
    ['fractional capacity', { maxCapacity: 2.5 }, 'maxCapacity'],
    ['capacity as a string', { maxCapacity: '10' }, 'maxCapacity'],
    ['capacity too large', { maxCapacity: 10_001 }, 'maxCapacity'],
    ['resources not an array', { resources: 'projector' }, 'resources'],
    ['blank resource', { resources: ['projector', ' '] }, 'resources'],
    ['non-string resource', { resources: [1] }, 'resources'],
    ['too many resources', { resources: Array.from({ length: 51 }, (_, i) => `r${i}`) }, 'resources'],
    ['unknown field', { id: 7 }, '_errors'],
  ])('returns 400 for %s', async (_case, override, field) => {
    const body = { ...createRoomBodyFactory.build(), ...override };
    expect(createRoomBodySchema.safeParse(body).success).toBe(false);

    const res = await ctx.api.post('/rooms/create').send(body).expect(400);
    const error = errorResponseSchema.parse(res.body);
    expect(error.message).toBe('invalid request body');
    expect(error.details).toHaveProperty(field);
  });

  it('rejects query params', async () => {
    const res = await ctx.api.post('/rooms/create?x=1').send(createRoomBodyFactory.build()).expect(400);
    expect(errorResponseSchema.parse(res.body).message).toBe('invalid query params');
  });
});
