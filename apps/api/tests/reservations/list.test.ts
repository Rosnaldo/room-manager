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
      (await ctx.api.get(`/reservations/list?${qs}`).set('X-User-Id', String(user.id)).expect(200)).body,
    );

  it('returns an empty page when the user has no reservations', async () => {
    reserve(joao, ipe, '2030-01-20T10:00:00', '2030-01-20T11:00:00');
    expect(await listAs(maria)).toEqual({ data: [], pagination: { currentPage: 1, totalPages: 0, totalRecords: 0, size: 20 } });
  });

  it("lists only the caller's reservations, in chronological order", async () => {
    const late = reserve(maria, ipe, '2030-02-01T09:00:00', '2030-02-01T10:00:00');
    reserve(joao, ipe, '2030-01-20T10:00:00', '2030-01-20T11:00:00');
    const early = reserve(maria, cedro, '2030-01-20T08:00:00', '2030-01-20T09:00:00');
    const middle = reserve(maria, ipe, '2030-01-20T14:00:00', '2030-01-20T15:00:00');
    reserve(joao, cedro, '2030-01-25T10:00:00', '2030-01-25T11:00:00');

    const page = await listAs(maria);
    expect(page.data).toEqual([early, middle, late]);
    expect(page.pagination.totalRecords).toBe(3);
  });

  it('paginates', async () => {
    const a = reserve(maria, ipe, '2030-01-20T08:00:00', '2030-01-20T09:00:00');
    const b = reserve(maria, ipe, '2030-01-20T10:00:00', '2030-01-20T11:00:00');
    const c = reserve(maria, ipe, '2030-01-20T12:00:00', '2030-01-20T13:00:00');

    const page1 = await listAs(maria, 'size=2');
    expect(page1.data).toEqual([a, b]);
    expect(page1.pagination).toEqual({ currentPage: 1, totalPages: 2, totalRecords: 3, size: 2 });
    expect((await listAs(maria, 'size=2&page=2')).data).toEqual([c]);
  });

  describe('caller identity', () => {
    it('returns 401 without X-User-Id', async () => {
      const res = await ctx.api.get('/reservations/list').expect(401);
      expect(errorResponseSchema.parse(res.body).message).toBe('Identifique o usuário (cabeçalho X-User-Id).');
    });

    it.each(['abc', '0', '-1', '1.5', ' '])('returns 401 for X-User-Id %j', async (value) => {
      await ctx.api.get('/reservations/list').set('X-User-Id', value).expect(401);
    });

    it('returns 401 for an unknown user', async () => {
      const res = await ctx.api.get('/reservations/list').set('X-User-Id', '9999').expect(401);
      expect(errorResponseSchema.parse(res.body).message).toBe('Usuário 9999 não encontrado.');
    });

    it('ignores a userId in the query: it cannot list someone else', async () => {
      reserve(joao, ipe, '2030-01-20T10:00:00', '2030-01-20T11:00:00');
      const res = await ctx.api.get(`/reservations/list?userId=${joao.id}`).set('X-User-Id', String(maria.id)).expect(400);
      expect(errorResponseSchema.parse(res.body).details?._errors?.[0]).toMatch(/userId/);
    });
  });

  it.each([
    ['page=0', 'page'],
    ['size=101', 'size'],
  ])('returns 400 for %s', async (qs, field) => {
    const res = await ctx.api.get(`/reservations/list?${qs}`).set('X-User-Id', String(maria.id)).expect(400);
    const error = errorResponseSchema.parse(res.body);
    expect(error.message).toBe('Parâmetros de consulta inválidos.');
    expect(error.details).toHaveProperty(field);
  });
});
