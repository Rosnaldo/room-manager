import { beforeEach, describe, expect, it } from 'vitest';
import type { IRoom, IUser } from '@repo/shared-types';

import { useTestApp } from '../helpers/app';
import { roomFactory } from '../factories/room.factory';
import { adminFactory, userFactory } from '../factories/user.factory';
import { reservedRoomFactory } from '../factories/reserved_room.factory';
import { errorResponseSchema } from '../../src/schemas/common';
import { RoomRepository } from '../../src/repositories/room';
import { ReservedRoomRepository } from '../../src/repositories/reserved_room';

describe('DELETE /rooms/delete/:id', () => {
  const ctx = useTestApp();
  let admin: IUser;
  let room: IRoom;

  beforeEach(() => {
    admin = adminFactory.create(ctx.db);
    room = roomFactory.create(ctx.db);
  });

  const deleteAs = (userId: number | undefined, id = room.id) =>
    ctx.api.delete(`/rooms/delete/${id}`).send(userId === undefined ? {} : { userId });
  const stillThere = () => new RoomRepository(ctx.db).findById(room.id) !== undefined;

  it('lets an admin delete it', async () => {
    await deleteAs(admin.id).expect(204);
    expect(stillThere()).toBe(false);
  });

  it("deletes the room's reservations with it", async () => {
    const customer = userFactory.create(ctx.db);
    const reservation = reservedRoomFactory.create(ctx.db, { userId: customer.id, roomId: room.id });
    await deleteAs(admin.id).expect(204);
    expect(new ReservedRoomRepository(ctx.db).findById(reservation.id)).toBeUndefined();
  });

  it('returns 403 for a regular user, and keeps the room', async () => {
    const res = await deleteAs(userFactory.create(ctx.db).id).expect(403);
    expect(errorResponseSchema.parse(res.body).message).toBe('Apenas administradores podem fazer isso.');
    expect(stillThere()).toBe(true);
  });

  it('returns 404 for an unknown userId', async () => {
    const res = await deleteAs(9999).expect(404);
    expect(errorResponseSchema.parse(res.body).message).toBe('Usuário 9999 não encontrado.');
    expect(stillThere()).toBe(true);
  });

  it('returns 400 without userId', async () => {
    const res = await deleteAs(undefined).expect(400);
    expect(errorResponseSchema.parse(res.body).details).toHaveProperty('userId');
    expect(stillThere()).toBe(true);
  });

  it('returns 404 for an unknown room, and twice', async () => {
    expect(errorResponseSchema.parse((await deleteAs(admin.id, 9999).expect(404)).body).message).toBe('Sala 9999 não encontrada.');
    await deleteAs(admin.id).expect(204);
    await deleteAs(admin.id).expect(404);
  });

  it('returns 400 for an invalid id', async () => {
    await ctx.api.delete('/rooms/delete/abc').send({ userId: admin.id }).expect(400);
  });
});

describe('GET /rooms/find/:id', () => {
  const ctx = useTestApp();

  it('returns the room', async () => {
    const room = roomFactory.create(ctx.db, { name: 'Sala Ipê', maxCapacity: 8, resources: ['tv'] });
    expect((await ctx.api.get(`/rooms/find/${room.id}`).expect(200)).body).toEqual(room);
  });

  it('returns 404 for an unknown room', async () => {
    const res = await ctx.api.get('/rooms/find/9999').expect(404);
    expect(errorResponseSchema.parse(res.body).message).toBe('Sala 9999 não encontrada.');
  });

  it('returns 400 for an invalid id', async () => {
    await ctx.api.get('/rooms/find/abc').expect(400);
  });
});
