import { beforeEach, describe, expect, it } from 'vitest';
import type { IRoom, IUser } from '@repo/shared-types';

import { useTestApp } from '../helpers/app';
import { roomFactory } from '../factories/room.factory';
import { userFactory } from '../factories/user.factory';
import { reservedRoomFactory } from '../factories/reserved_room.factory';
import { listReservedRoomsResponseSchema } from '../../src/schemas/reserved_room';
import { errorResponseSchema } from '../../src/schemas/common';

describe('GET /reservations/list', () => {
  const ctx = useTestApp();
  let maria: IUser;
  let joao: IUser;
  let ipe: IRoom;
  let cedro: IRoom;

  beforeEach(() => {
    maria = userFactory.create(ctx.db);
    joao = userFactory.create(ctx.db);
    ipe = roomFactory.create(ctx.db);
    cedro = roomFactory.create(ctx.db);
  });

  const reserve = (user: IUser, room: IRoom, startAt: string, endAt: string) =>
    reservedRoomFactory.create(ctx.db, { userId: user.id, roomId: room.id, startAt, endAt });
  const listAs = async (user: IUser, qs = '') =>
    listReservedRoomsResponseSchema.parse(
      (await ctx.api.get(`/reservations/list?userId=${user.id}${qs && `&${qs}`}`).expect(200)).body,
    );

  it('returns an empty page when the user has no reservations', async () => {
    reserve(joao, ipe, '2030-01-21T10:00:00', '2030-01-21T11:00:00');
    expect(await listAs(maria)).toEqual({ data: [], pagination: { currentPage: 1, totalPages: 0, totalRecords: 0, size: 20 } });
  });

  it("lists only the caller's reservations, in chronological order", async () => {
    const late = reserve(maria, ipe, '2030-02-01T09:00:00', '2030-02-01T10:00:00');
    reserve(joao, ipe, '2030-01-21T10:00:00', '2030-01-21T11:00:00');
    const early = reserve(maria, cedro, '2030-01-21T08:00:00', '2030-01-21T09:00:00');
    const middle = reserve(maria, ipe, '2030-01-21T14:00:00', '2030-01-21T15:00:00');
    reserve(joao, cedro, '2030-01-25T10:00:00', '2030-01-25T11:00:00');

    const page = await listAs(maria);
    expect(page.data).toEqual([early, middle, late]);
    expect(page.pagination.totalRecords).toBe(3);
  });

  it('paginates', async () => {
    const a = reserve(maria, ipe, '2030-01-21T08:00:00', '2030-01-21T09:00:00');
    const b = reserve(maria, ipe, '2030-01-21T10:00:00', '2030-01-21T11:00:00');
    const c = reserve(maria, ipe, '2030-01-21T12:00:00', '2030-01-21T13:00:00');

    const page1 = await listAs(maria, 'size=2');
    expect(page1.data).toEqual([a, b]);
    expect(page1.pagination).toEqual({ currentPage: 1, totalPages: 2, totalRecords: 3, size: 2 });
    expect((await listAs(maria, 'size=2&page=2')).data).toEqual([c]);
  });

  describe('userId', () => {
    it.each([
      ['missing', ''],
      ['malformed', 'userId=abc'],
      ['zero', 'userId=0'],
      ['negative', 'userId=-1'],
    ])('returns 400 when %s', async (_case, qs) => {
      const res = await ctx.api.get(`/reservations/list?${qs}`).expect(400);
      expect(errorResponseSchema.parse(res.body).details).toHaveProperty('userId');
    });

    it('returns 404 for an unknown user', async () => {
      const res = await ctx.api.get('/reservations/list?userId=9999').expect(404);
      expect(errorResponseSchema.parse(res.body).message).toBe('Usuário 9999 não encontrado.');
    });
  });

  it.each([
    ['page=0', 'page'],
    ['size=101', 'size'],
  ])('returns 400 for %s', async (qs, field) => {
    const res = await ctx.api.get(`/reservations/list?userId=${maria.id}&${qs}`).expect(400);
    const error = errorResponseSchema.parse(res.body);
    expect(error.message).toBe('Parâmetros de consulta inválidos.');
    expect(error.details).toHaveProperty(field);
  });
});
