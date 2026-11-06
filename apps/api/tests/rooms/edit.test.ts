import { beforeEach, describe, expect, it } from 'vitest';
import type { IRoom, IUser } from '@repo/shared-types';

import { useTestApp } from '../helpers/app';
import { roomFactory } from '../factories/room.factory';
import { adminFactory, userFactory } from '../factories/user.factory';
import { editRoomBodySchema, roomResponseSchema } from '../../src/schemas/room';
import { errorResponseSchema } from '../../src/schemas/common';
import { RoomRepository } from '../../src/repositories/room';

describe('PATCH /rooms/edit/:id', () => {
  const ctx = useTestApp();
  let admin: IUser;
  let room: IRoom;

  beforeEach(() => {
    admin = adminFactory.create(ctx.db);
    room = roomFactory.create(ctx.db, { name: 'Sala Ipê', maxCapacity: 8, resources: ['projector', 'whiteboard'] });
  });

  /** PATCH with `user` as the caller (userId in the body); `undefined` sends the body as is */
  const patchAs = (user: IUser | undefined, body: object, id = room.id) =>
    ctx.api.patch(`/rooms/edit/${id}`).send(user ? { userId: user.id, ...body } : body);
  const stored = () => new RoomRepository(ctx.db).findById(room.id);

  it('updates every field and returns the room', async () => {
    const res = await patchAs(admin, { name: 'Sala Ipê Grande', maxCapacity: 20, resources: ['tv'] }).expect(200);
    const updated = roomResponseSchema.parse(res.body);
    expect(updated).toEqual({ id: room.id, name: 'Sala Ipê Grande', maxCapacity: 20, resources: ['tv'] });
    expect(stored()).toEqual(updated);
  });

  it('changes only the fields sent', async () => {
    const updated = roomResponseSchema.parse((await patchAs(admin, { maxCapacity: 12 }).expect(200)).body);
    expect(updated).toEqual({ ...room, maxCapacity: 12 });
  });

  it('replaces the resources list, normalized', async () => {
    const updated = roomResponseSchema.parse((await patchAs(admin, { resources: [' TV', 'tv', 'Microphone'] }).expect(200)).body);
    expect(updated.resources).toEqual(['tv', 'microphone']);
  });

  it('can clear the resources', async () => {
    expect(roomResponseSchema.parse((await patchAs(admin, { resources: [] }).expect(200)).body).resources).toEqual([]);
  });

  it('lets a room keep or re-case its own name', async () => {
    await patchAs(admin, { name: 'Sala Ipê' }).expect(200);
    expect(roomResponseSchema.parse((await patchAs(admin, { name: 'SALA IPÊ' }).expect(200)).body).name).toBe('SALA IPÊ');
  });

  it("returns 409 for another room's name, ignoring case", async () => {
    roomFactory.create(ctx.db, { name: 'Sala Cedro' });
    const res = await patchAs(admin, { name: 'sala cedro' }).expect(409);
    expect(errorResponseSchema.parse(res.body).message).toBe('Já existe uma sala chamada sala cedro.');
    expect(stored()?.name).toBe('Sala Ipê');
  });

  it('returns 404 for an unknown room', async () => {
    const res = await patchAs(admin, { maxCapacity: 3 }, 9999).expect(404);
    expect(errorResponseSchema.parse(res.body).message).toBe('Sala 9999 não encontrada.');
  });

  describe('permissions', () => {
    it('returns 403 for a regular user, and changes nothing', async () => {
      const res = await patchAs(userFactory.create(ctx.db), { maxCapacity: 99 }).expect(403);
      expect(errorResponseSchema.parse(res.body).message).toBe('Apenas administradores podem fazer isso.');
      expect(stored()).toEqual(room);
    });

    it('returns 400 without userId', async () => {
      const res = await patchAs(undefined, { maxCapacity: 99 }).expect(400);
      expect(errorResponseSchema.parse(res.body).details).toHaveProperty('userId');
      expect(stored()).toEqual(room);
    });

    it('returns 404 for an unknown userId, and changes nothing', async () => {
      const res = await patchAs(undefined, { userId: 9999, maxCapacity: 99 }).expect(404);
      expect(errorResponseSchema.parse(res.body).message).toBe('Usuário 9999 não encontrado.');
      expect(stored()).toEqual(room);
    });

    it('checks the caller before the room: a regular user gets 403 even for an unknown room', async () => {
      await patchAs(userFactory.create(ctx.db), { maxCapacity: 3 }, 9999).expect(403);
    });
  });

  it.each([
    ['only userId', {}, '_errors'],
    ['blank name', { name: '  ' }, 'name'],
    ['zero capacity', { maxCapacity: 0 }, 'maxCapacity'],
    ['capacity as a string', { maxCapacity: '10' }, 'maxCapacity'],
    ['resources not an array', { resources: 'tv' }, 'resources'],
    ['unknown field', { id: 7 }, '_errors'],
  ])('returns 400 for %s', async (_case, body, field) => {
    expect(editRoomBodySchema.safeParse({ userId: admin.id, ...body }).success).toBe(false);
    const res = await patchAs(admin, body).expect(400);
    const error = errorResponseSchema.parse(res.body);
    expect(error.message).toBe('Dados inválidos.');
    expect(error.details).toHaveProperty(field);
    expect(stored()).toEqual(room);
  });

  it('returns 400 for an invalid id', async () => {
    const res = await ctx.api.patch('/rooms/edit/abc').send({ userId: admin.id, maxCapacity: 3 }).expect(400);
    expect(errorResponseSchema.parse(res.body).message).toBe('Parâmetros da URL inválidos.');
  });
});
