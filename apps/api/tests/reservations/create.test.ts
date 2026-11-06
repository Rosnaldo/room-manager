import { beforeEach, describe, expect, it } from 'vitest';
import type { IRoom, IUser } from '@repo/shared-types';

import { useTestApp } from '../helpers/app';
import { roomFactory } from '../factories/room.factory';
import { adminFactory, userFactory } from '../factories/user.factory';
import { createReservedRoomBodyFactory, reservedRoomFactory } from '../factories/reserved_room.factory';
import { createReservedRoomBodySchema, reservedRoomResponseSchema } from '../../src/schemas/reserved_room';
import { errorResponseSchema } from '../../src/schemas/common';
import { ReservedRoomRepository } from '../../src/repositories/reserved_room';

// 12:00 UTC = 09:00 in America/Sao_Paulo (the default APP_TIMEZONE)
const NOW = new Date('2030-01-15T12:00:00Z');

describe('POST /reservations/create', () => {
  const ctx = useTestApp({ now: () => NOW });
  let user: IUser;
  let room: IRoom;

  beforeEach(() => {
    user = userFactory.create(ctx.db);
    room = roomFactory.create(ctx.db);
  });

  const body = (overrides: Partial<Parameters<typeof createReservedRoomBodyFactory.build>[0]> = {}) =>
    createReservedRoomBodyFactory.build({ userId: user.id, roomId: room.id, ...overrides });
  const post = (payload: unknown) => ctx.api.post('/reservations/create').send(payload as object);
  const reserve = (startAt: string, endAt: string, roomId = room.id) =>
    reservedRoomFactory.create(ctx.db, { userId: user.id, roomId, startAt, endAt });

  it('creates a reservation and returns a body matching the response schema', async () => {
    const payload = body();
    expect(createReservedRoomBodySchema.safeParse(payload).success).toBe(true);

    const res = await post(payload).expect(201);

    const reservation = reservedRoomResponseSchema.parse(res.body);
    expect(reservation).toEqual({ id: expect.any(Number), ...payload });
    expect(new ReservedRoomRepository(ctx.db).findById(reservation.id)).toEqual(reservation);
  });

  describe('duration', () => {
    it.each([
      ['exactly 15 minutes', '2030-01-20T10:00:00', '2030-01-20T10:15:00'],
      ['exactly 4 hours', '2030-01-20T10:00:00', '2030-01-20T14:00:00'],
      ['across midnight', '2030-01-20T23:00:00', '2030-01-21T01:00:00'],
    ])('accepts %s', async (_case, startAt, endAt) => {
      await post(body({ startAt, endAt })).expect(201);
    });

    it.each([
      ['14 minutes', '2030-01-20T10:00:00', '2030-01-20T10:14:00', /pelo menos 15 minutos/],
      ["4 hours and 1 minute (the room's default 04:00)", '2030-01-20T10:00:00', '2030-01-20T14:01:00', /nesta sala deve durar no máximo 4h\./],
      ['end equal to start', '2030-01-20T10:00:00', '2030-01-20T10:00:00', /O fim deve ser depois do início/],
      ['end before start', '2030-01-20T11:00:00', '2030-01-20T10:00:00', /O fim deve ser depois do início/],
    ])('rejects %s', async (_case, startAt, endAt, message) => {
      const res = await post(body({ startAt, endAt })).expect(400);
      const error = errorResponseSchema.parse(res.body);
      expect(error.details?.endAt?.[0]).toMatch(message);
    });
  });

  describe('past', () => {
    it('rejects a start before now (in APP_TIMEZONE)', async () => {
      const res = await post(body({ startAt: '2030-01-15T08:59:00', endAt: '2030-01-15T10:00:00' })).expect(400);
      expect(errorResponseSchema.parse(res.body).details).toEqual({ startAt: ['O início não pode estar no passado.'] });
    });

    it('rejects a day in the past', async () => {
      await post(body({ startAt: '2030-01-14T10:00:00', endAt: '2030-01-14T11:00:00' })).expect(400);
    });

    it('accepts a start at the current minute', async () => {
      await post(body({ startAt: '2030-01-15T09:00:00', endAt: '2030-01-15T10:00:00' })).expect(201);
    });

    it('uses local time, not UTC: 10:00 local is still ahead even though it is 12:00 UTC', async () => {
      await post(body({ startAt: '2030-01-15T10:00:00', endAt: '2030-01-15T11:00:00' })).expect(201);
    });
  });

  describe('overlap with another reservation of the same room', () => {
    beforeEach(() => {
      reserve('2030-01-20T10:00:00', '2030-01-20T11:00:00');
    });

    it.each([
      ['identical slot', '2030-01-20T10:00:00', '2030-01-20T11:00:00'],
      ['starts inside', '2030-01-20T10:30:00', '2030-01-20T11:30:00'],
      ['ends inside', '2030-01-20T09:30:00', '2030-01-20T10:30:00'],
      ['contains it', '2030-01-20T09:00:00', '2030-01-20T12:00:00'],
      ['inside it', '2030-01-20T10:15:00', '2030-01-20T10:45:00'],
    ])('rejects %s with 409', async (_case, startAt, endAt) => {
      const res = await post(body({ startAt, endAt })).expect(409);
      expect(errorResponseSchema.parse(res.body).message).toBe(
        'A sala já está reservada das 10:00 às 11:00 de 20/01/2030.',
      );
    });

    it.each([
      ['ending exactly when it starts', '2030-01-20T09:00:00', '2030-01-20T10:00:00'],
      ['starting exactly when it ends', '2030-01-20T11:00:00', '2030-01-20T12:00:00'],
      ['on another day', '2030-01-21T10:00:00', '2030-01-21T11:00:00'],
    ])('accepts a slot %s', async (_case, startAt, endAt) => {
      await post(body({ startAt, endAt })).expect(201);
    });

    it('allows the same slot in a different room', async () => {
      const other = roomFactory.create(ctx.db);
      await post(body({ roomId: other.id })).expect(201);
    });

    it('rejects it even when another user books', async () => {
      const other = userFactory.create(ctx.db);
      await post(body({ userId: other.id, startAt: '2030-01-20T10:30:00', endAt: '2030-01-20T11:30:00' })).expect(409);
    });

    it('does not save the rejected reservation', async () => {
      await post(body({ startAt: '2030-01-20T10:30:00', endAt: '2030-01-20T11:30:00' })).expect(409);
      expect(ctx.db.$client.prepare('select count(*) as n from reserved_rooms').get()).toEqual({ n: 1 });
    });
  });

  it('returns 404 for an unknown user', async () => {
    const res = await post(body({ userId: 9999 })).expect(404);
    expect(errorResponseSchema.parse(res.body).message).toBe('Usuário 9999 não encontrado.');
  });

  it('returns 404 for an unknown room', async () => {
    const res = await post(body({ roomId: 9999 })).expect(404);
    expect(errorResponseSchema.parse(res.body).message).toBe('Sala 9999 não encontrada.');
  });

  it.each([
    ['missing userId', { userId: undefined }, 'userId'],
    ['missing roomId', { roomId: undefined }, 'roomId'],
    ['missing startAt', { startAt: undefined }, 'startAt'],
    ['missing endAt', { endAt: undefined }, 'endAt'],
    ['roomId as a string', { roomId: '1' }, 'roomId'],
    ['date without time', { startAt: '2030-01-20' }, 'startAt'],
    ['time without seconds', { startAt: '2030-01-20T10:00' }, 'startAt'],
    ['timezone suffix', { endAt: '2030-01-20T11:00:00Z' }, 'endAt'],
    ['impossible date', { startAt: '2030-02-30T10:00:00' }, 'startAt'],
    ['unknown field', { note: 'x' }, '_errors'],
  ])('returns 400 for %s', async (_case, override, field) => {
    const payload = { ...body(), ...override };
    expect(createReservedRoomBodySchema.safeParse(payload).success).toBe(false);

    const res = await post(payload).expect(400);
    const error = errorResponseSchema.parse(res.body);
    expect(error.message).toBe('Dados inválidos.');
    expect(error.details).toHaveProperty(field);
  });

  it('rejects query params', async () => {
    const res = await ctx.api.post('/reservations/create?x=1').send(body()).expect(400);
    expect(errorResponseSchema.parse(res.body).message).toBe('Parâmetros de consulta inválidos.');
  });

  it('is removed with its room (cascade)', async () => {
    const created = reservedRoomResponseSchema.parse((await post(body()).expect(201)).body);
    ctx.db.$client.prepare('delete from rooms where id = ?').run(room.id);
    expect(new ReservedRoomRepository(ctx.db).findById(created.id)).toBeUndefined();
  });
});

describe('POST /reservations/create conflict message', () => {
  const ctx = useTestApp({ now: () => NOW });

  it('names both dates when the existing reservation crosses midnight', async () => {
    const user = userFactory.create(ctx.db);
    const room = roomFactory.create(ctx.db);
    reservedRoomFactory.create(ctx.db, { userId: user.id, roomId: room.id, startAt: '2030-01-20T23:00:00', endAt: '2030-01-21T01:00:00' });

    const res = await ctx.api
      .post('/reservations/create')
      .send({ userId: user.id, roomId: room.id, startAt: '2030-01-21T00:30:00', endAt: '2030-01-21T02:00:00' })
      .expect(409);
    expect(errorResponseSchema.parse(res.body).message).toBe('A sala já está reservada de 20/01/2030 23:00 até 21/01/2030 01:00.');
  });
});

describe("POST /reservations/create with the room's own maxDuration", () => {
  const ctx = useTestApp({ now: () => NOW });

  const reserveIn = async (maxDuration: string, startAt: string, endAt: string, lang?: string) => {
    const user = userFactory.create(ctx.db);
    const room = roomFactory.create(ctx.db, { maxDuration });
    const req = ctx.api.post('/reservations/create');
    if (lang) req.set('Accept-Language', lang);
    return req.send({ userId: user.id, roomId: room.id, startAt, endAt });
  };

  it('rooms created before the field default to 04:00', () => {
    expect(roomFactory.create(ctx.db).maxDuration).toBe('04:00');
  });

  it.each([
    ['01:00', '2030-01-20T10:00:00', '2030-01-20T11:00:00'],
    ['01:30', '2030-01-20T10:00:00', '2030-01-20T11:30:00'],
    ['08:00', '2030-01-20T09:00:00', '2030-01-20T17:00:00'],
    ['00:15', '2030-01-20T10:00:00', '2030-01-20T10:15:00'],
  ])('accepts exactly the maximum of a %s room', async (maxDuration, startAt, endAt) => {
    expect((await reserveIn(maxDuration, startAt, endAt)).status).toBe(201);
  });

  it.each([
    ['01:00', '2030-01-20T10:00:00', '2030-01-20T11:01:00', 'A reserva nesta sala deve durar no máximo 1h.'],
    ['01:30', '2030-01-20T10:00:00', '2030-01-20T11:31:00', 'A reserva nesta sala deve durar no máximo 1h30min.'],
    ['00:45', '2030-01-20T10:00:00', '2030-01-20T10:46:00', 'A reserva nesta sala deve durar no máximo 45min.'],
  ])('rejects one minute over a %s room', async (maxDuration, startAt, endAt, message) => {
    const res = await reserveIn(maxDuration, startAt, endAt);
    expect(res.status).toBe(400);
    expect(errorResponseSchema.parse(res.body).details).toEqual({ endAt: [message] });
  });

  it('lets a long room go past the old 4-hour limit', async () => {
    expect((await reserveIn('08:00', '2030-01-20T09:00:00', '2030-01-20T15:00:00')).status).toBe(201);
  });

  it('keeps the 15-minute minimum for every room', async () => {
    const res = await reserveIn('08:00', '2030-01-20T10:00:00', '2030-01-20T10:10:00');
    expect(res.status).toBe(400);
    expect(errorResponseSchema.parse(res.body).details?.endAt).toEqual(['A reserva deve durar pelo menos 15 minutos.']);
  });

  it('translates the limit with its value', async () => {
    const res = await reserveIn('02:00', '2030-01-20T10:00:00', '2030-01-20T13:00:00', 'en');
    expect(errorResponseSchema.parse(res.body).details).toEqual({ endAt: ['reservation must last at most 2h in this room'] });
  });

  it("applies the room's current limit: after lowering it, longer new bookings are refused", async () => {
    const user = userFactory.create(ctx.db);
    const room = roomFactory.create(ctx.db, { maxDuration: '04:00' });
    // fits the lower limit below, so lowering is allowed
    await ctx.api.post('/reservations/create').send({ userId: user.id, roomId: room.id, startAt: '2030-01-20T10:00:00', endAt: '2030-01-20T11:00:00' }).expect(201);

    const admin = adminFactory.create(ctx.db);
    await ctx.api.patch(`/rooms/edit/${room.id}`).send({ userId: admin.id, maxDuration: '01:00' }).expect(200);

    await ctx.api.post('/reservations/create').send({ userId: user.id, roomId: room.id, startAt: '2030-01-21T10:00:00', endAt: '2030-01-21T13:00:00' }).expect(400);
  });
});
