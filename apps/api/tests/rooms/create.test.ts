import { beforeEach, describe, expect, it } from 'vitest';
import type { IUser } from '@repo/shared-types';

import { useTestApp } from '../helpers/app';
import { createRoomBodyFactory, roomFactory } from '../factories/room.factory';
import { createRoomBodySchema, roomResponseSchema } from '../../src/schemas/room';
import { errorResponseSchema } from '../../src/schemas/common';
import { RoomRepository } from '../../src/repositories/room';
import { adminFactory, userFactory } from '../factories/user.factory';

describe('POST /rooms/create', () => {
  const ctx = useTestApp();
  let admin: IUser;
  beforeEach(() => {
    admin = adminFactory.create(ctx.db);
  });
  /** a valid body sent by the admin */
  const build = (overrides: Partial<ReturnType<typeof createRoomBodyFactory.build>> = {}) =>
    createRoomBodyFactory.build({ userId: admin.id, ...overrides });
  const post = (path = '/rooms/create') => ctx.api.post(path);

  it('creates a room and returns a body matching the response schema', async () => {
    const body = build();
    expect(createRoomBodySchema.safeParse(body).success).toBe(true);

    const res = await post().send(body).expect(201);

    const room = roomResponseSchema.parse(res.body);
    // userId only identifies the caller: it isn't part of the room
    expect(room).toEqual({ id: expect.any(Number), name: body.name, maxCapacity: body.maxCapacity, resources: body.resources });
    expect(new RoomRepository(ctx.db).findById(room.id)).toEqual(room);
  });

  it('normalizes resources: trims, lowercases and de-duplicates', async () => {
    const body = build({ name: '  Sala Azul ', resources: [' Projector', 'TV', 'projector ', 'tv'] });

    const room = roomResponseSchema.parse((await post().send(body).expect(201)).body);

    expect(room).toMatchObject({ name: 'Sala Azul', resources: ['projector', 'tv'] });
  });

  it('defaults resources to an empty array', async () => {
    const res = await post().send({ userId: admin.id, name: 'Bare', maxCapacity: 2 }).expect(201);
    expect(roomResponseSchema.parse(res.body).resources).toEqual([]);
  });

  it('returns 409 for a duplicate name, ignoring case', async () => {
    roomFactory.create(ctx.db, { name: 'Sala Azul' });

    const res = await post().send(build({ name: 'SALA AZUL' })).expect(409);
    expect(errorResponseSchema.parse(res.body).message).toMatch(/Já existe uma sala chamada/);
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
    ['missing userId', { userId: undefined }, 'userId'],
    ['userId as a string', { userId: '1' }, 'userId'],
  ])('returns 400 for %s', async (_case, override, field) => {
    const body = { ...build(), ...override };
    expect(createRoomBodySchema.safeParse(body).success).toBe(false);

    const res = await post().send(body).expect(400);
    const error = errorResponseSchema.parse(res.body);
    expect(error.message).toBe('Dados inválidos.');
    expect(error.details).toHaveProperty(field);
  });

  it('rejects query params', async () => {
    const res = await post('/rooms/create?x=1').send(build()).expect(400);
    expect(errorResponseSchema.parse(res.body).message).toBe('Parâmetros de consulta inválidos.');
  });

  describe('permissions', () => {
    it('returns 403 for a regular user, and creates nothing', async () => {
      const customer = userFactory.create(ctx.db);
      const res = await post().send(build({ userId: customer.id })).expect(403);
      expect(errorResponseSchema.parse(res.body).message).toBe('Apenas administradores podem fazer isso.');
      expect(new RoomRepository(ctx.db).list({ page: 1, size: 10 }).pagination.totalRecords).toBe(0);
    });

    it('returns 404 for an unknown userId', async () => {
      const res = await post().send(build({ userId: 9999 })).expect(404);
      expect(errorResponseSchema.parse(res.body).message).toBe('Usuário 9999 não encontrado.');
    });
  });
});
