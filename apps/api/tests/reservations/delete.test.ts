import { beforeEach, describe, expect, it } from 'vitest';
import type { IReservedRoom, IUser } from '@repo/shared-types';

import { useTestApp } from '../helpers/app';
import { roomFactory } from '../factories/room.factory';
import { adminFactory, userFactory } from '../factories/user.factory';
import { reservedRoomFactory } from '../factories/reserved_room.factory';
import { errorResponseSchema } from '../../src/schemas/common';
import { ReservedRoomRepository } from '../../src/repositories/reserved_room';

describe('DELETE /reservations/delete/:id', () => {
  const ctx = useTestApp();
  let owner: IUser;
  let reservation: IReservedRoom;

  beforeEach(() => {
    owner = userFactory.create(ctx.db);
    const room = roomFactory.create(ctx.db);
    reservation = reservedRoomFactory.create(ctx.db, { userId: owner.id, roomId: room.id });
  });

  /** DELETE with `user` as the caller (userId in the body) */
  const deleteAs = (user: IUser | undefined, id = reservation.id) =>
    ctx.api.delete(`/reservations/delete/${id}`).send(user ? { userId: user.id } : {});
  const stillThere = () => new ReservedRoomRepository(ctx.db).findById(reservation.id) !== undefined;

  it('lets the owner cancel it', async () => {
    const res = await deleteAs(owner).expect(204);
    expect(res.body).toEqual({});
    expect(stillThere()).toBe(false);
  });

  it("forbids an admin from cancelling someone else's", async () => {
    await deleteAs(adminFactory.create(ctx.db)).expect(403);
    expect(stillThere()).toBe(true);
  });

  it("forbids another user from cancelling it", async () => {
    const res = await deleteAs(userFactory.create(ctx.db)).expect(403);
    expect(errorResponseSchema.parse(res.body).message).toBe('Só quem fez a reserva pode cancelá-la.');
    expect(stillThere()).toBe(true);
  });

  it('frees the slot for a new booking', async () => {
    await deleteAs(owner).expect(204);
    const again = reservedRoomFactory.create(ctx.db, { userId: owner.id, roomId: reservation.roomId });
    expect(again.startAt).toBe(reservation.startAt);
  });

  it('returns 404 for an unknown reservation', async () => {
    const res = await deleteAs(owner, 9999).expect(404);
    expect(errorResponseSchema.parse(res.body).message).toBe('Reserva 9999 não encontrada.');
  });

  it('returns 404 when cancelling twice', async () => {
    await deleteAs(owner).expect(204);
    await deleteAs(owner).expect(404);
  });

  it('returns 400 without userId', async () => {
    const res = await deleteAs(undefined).expect(400);
    expect(errorResponseSchema.parse(res.body).details).toHaveProperty('userId');
    expect(stillThere()).toBe(true);
  });

  it('returns 404 for an unknown userId', async () => {
    const res = await ctx.api.delete(`/reservations/delete/${reservation.id}`).send({ userId: 9999 }).expect(404);
    expect(errorResponseSchema.parse(res.body).message).toBe('Usuário 9999 não encontrado.');
    expect(stillThere()).toBe(true);
  });


  it.each(['abc', '0', '-1'])('returns 400 for id %s', async (id) => {
    const res = await ctx.api.delete(`/reservations/delete/${id}`).send({ userId: owner.id }).expect(400);
    expect(errorResponseSchema.parse(res.body).message).toBe('Parâmetros da URL inválidos.');
  });

  it('answers in English when asked', async () => {
    const res = await deleteAs(userFactory.create(ctx.db)).set('Accept-Language', 'en').expect(403);
    expect(res.body).toEqual({ message: 'only the owner can cancel this reservation' });
  });
});
