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
      ['exactly 15 minutes', '2030-01-21T10:00:00', '2030-01-21T10:15:00'],
      ['exactly 4 hours', '2030-01-21T10:00:00', '2030-01-21T14:00:00'],
    ])('accepts %s', async (_case, startAt, endAt) => {
      await post(body({ startAt, endAt })).expect(201);
    });

    it.each([
      ['14 minutes', '2030-01-21T10:00:00', '2030-01-21T10:14:00', /pelo menos 15 minutos/],
      ["4 hours and 1 minute (the room's default 04:00)", '2030-01-21T10:00:00', '2030-01-21T14:01:00', /nesta sala deve durar no máximo 4h\./],
      ['end equal to start', '2030-01-21T10:00:00', '2030-01-21T10:00:00', /O fim deve ser depois do início/],
      ['end before start', '2030-01-21T11:00:00', '2030-01-21T10:00:00', /O fim deve ser depois do início/],
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
      reserve('2030-01-21T10:00:00', '2030-01-21T11:00:00');
    });

    it.each([
      ['identical slot', '2030-01-21T10:00:00', '2030-01-21T11:00:00'],
      ['starts inside', '2030-01-21T10:30:00', '2030-01-21T11:30:00'],
      ['ends inside', '2030-01-21T09:30:00', '2030-01-21T10:30:00'],
      ['contains it', '2030-01-21T09:00:00', '2030-01-21T12:00:00'],
      ['inside it', '2030-01-21T10:15:00', '2030-01-21T10:45:00'],
    ])('rejects %s with 409', async (_case, startAt, endAt) => {
      const res = await post(body({ startAt, endAt })).expect(409);
      expect(errorResponseSchema.parse(res.body).message).toBe(
        'A sala já está reservada das 10:00 às 11:00 de 21/01/2030.',
      );
    });

    it.each([
      ['ending exactly when it starts', '2030-01-21T09:00:00', '2030-01-21T10:00:00'],
      ['starting exactly when it ends', '2030-01-21T11:00:00', '2030-01-21T12:00:00'],
      ['on another day', '2030-01-22T10:00:00', '2030-01-22T11:00:00'],
    ])('accepts a slot %s', async (_case, startAt, endAt) => {
      await post(body({ startAt, endAt })).expect(201);
    });

    it('allows the same slot in a different room', async () => {
      const other = roomFactory.create(ctx.db);
      await post(body({ roomId: other.id })).expect(201);
    });

    it('rejects it even when another user books', async () => {
      const other = userFactory.create(ctx.db);
      await post(body({ userId: other.id, startAt: '2030-01-21T10:30:00', endAt: '2030-01-21T11:30:00' })).expect(409);
    });

    it('does not save the rejected reservation', async () => {
      await post(body({ startAt: '2030-01-21T10:30:00', endAt: '2030-01-21T11:30:00' })).expect(409);
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
    ['date without time', { startAt: '2030-01-21' }, 'startAt'],
    ['time without seconds', { startAt: '2030-01-21T10:00' }, 'startAt'],
    ['timezone suffix', { endAt: '2030-01-21T11:00:00Z' }, 'endAt'],
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

describe('POST /reservations/create business hours (SALA-5): weekdays, 08:00 to 20:00', () => {
  const ctx = useTestApp({ now: () => NOW });
  let user: IUser;
  let room: IRoom;

  beforeEach(() => {
    user = userFactory.create(ctx.db);
    room = roomFactory.create(ctx.db);
  });

  const post = (startAt: string, endAt: string, lang?: string) => {
    const req = ctx.api.post('/reservations/create');
    if (lang) req.set('Accept-Language', lang);
    return req.send({ userId: user.id, roomId: room.id, startAt, endAt });
  };

  // 2030-01-21 is a Monday … 2030-01-25 a Friday; 2030-01-26/27 the weekend
  it.each([
    ['Monday', '2030-01-21'],
    ['Tuesday', '2030-01-22'],
    ['Wednesday', '2030-01-23'],
    ['Thursday', '2030-01-24'],
    ['Friday', '2030-01-25'],
  ])('accepts a %s', async (_day, date) => {
    await post(`${date}T10:00:00`, `${date}T11:00:00`).expect(201);
  });

  it.each([
    ['Saturday', '2030-01-26'],
    ['Sunday', '2030-01-27'],
  ])('rejects a %s', async (_day, date) => {
    const res = await post(`${date}T10:00:00`, `${date}T11:00:00`).expect(400);
    expect(errorResponseSchema.parse(res.body).details).toEqual({
      startAt: ['Reservas só podem ser feitas em dias úteis (segunda a sexta).'],
    });
  });

  it.each([
    ['starting exactly at opening', '2030-01-21T08:00:00', '2030-01-21T09:00:00'],
    ['ending exactly at closing', '2030-01-21T19:00:00', '2030-01-21T20:00:00'],
    ['the last 15 minutes of the day', '2030-01-21T19:45:00', '2030-01-21T20:00:00'],
    ['a full 4 hours inside the window', '2030-01-21T16:00:00', '2030-01-21T20:00:00'],
  ])('accepts %s', async (_case, startAt, endAt) => {
    await post(startAt, endAt).expect(201);
  });

  it.each([
    ['starting before 08:00', '2030-01-21T07:59:00', '2030-01-21T09:00:00', 'startAt'],
    ['starting at 07:00', '2030-01-21T07:00:00', '2030-01-21T08:00:00', 'startAt'],
    ['ending after 20:00', '2030-01-21T19:00:00', '2030-01-21T20:01:00', 'endAt'],
    ['starting at 20:00', '2030-01-21T20:00:00', '2030-01-21T20:30:00', 'startAt'],
    ['crossing midnight', '2030-01-21T23:00:00', '2030-01-22T01:00:00', 'startAt'],
  ])('rejects %s', async (_case, startAt, endAt, field) => {
    const res = await post(startAt, endAt).expect(400);
    expect(errorResponseSchema.parse(res.body).details?.[field]).toContain('Reservas só podem acontecer das 08:00 às 20:00.');
  });

  it('reports both ends when the booking starts too early and ends too late', async () => {
    const res = await post('2030-01-21T06:00:00', '2030-01-21T21:00:00').expect(400);
    const { details } = errorResponseSchema.parse(res.body);
    expect(details?.startAt).toContain('Reservas só podem acontecer das 08:00 às 20:00.');
    expect(details?.endAt).toContain('Reservas só podem acontecer das 08:00 às 20:00.');
  });

  it('reports the weekend and the hours together', async () => {
    const res = await post('2030-01-26T07:00:00', '2030-01-26T08:00:00').expect(400);
    expect(errorResponseSchema.parse(res.body).details?.startAt).toEqual([
      'Reservas só podem ser feitas em dias úteis (segunda a sexta).',
      'Reservas só podem acontecer das 08:00 às 20:00.',
    ]);
  });

  it('saves nothing when outside business hours', async () => {
    await post('2030-01-26T10:00:00', '2030-01-26T11:00:00').expect(400);
    expect(ctx.db.$client.prepare('select count(*) as n from reserved_rooms').get()).toEqual({ n: 0 });
  });

  it('answers in English when asked', async () => {
    const res = await post('2030-01-27T10:00:00', '2030-01-27T11:00:00', 'en').expect(400);
    expect(errorResponseSchema.parse(res.body).details?.startAt).toEqual(['reservations are only allowed on weekdays (Monday to Friday)']);
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
    ['01:00', '2030-01-21T10:00:00', '2030-01-21T11:00:00'],
    ['01:30', '2030-01-21T10:00:00', '2030-01-21T11:30:00'],
    ['08:00', '2030-01-21T09:00:00', '2030-01-21T17:00:00'],
    ['00:15', '2030-01-21T10:00:00', '2030-01-21T10:15:00'],
  ])('accepts exactly the maximum of a %s room', async (maxDuration, startAt, endAt) => {
    expect((await reserveIn(maxDuration, startAt, endAt)).status).toBe(201);
  });

  it.each([
    ['01:00', '2030-01-21T10:00:00', '2030-01-21T11:01:00', 'A reserva nesta sala deve durar no máximo 1h.'],
    ['01:30', '2030-01-21T10:00:00', '2030-01-21T11:31:00', 'A reserva nesta sala deve durar no máximo 1h30min.'],
    ['00:45', '2030-01-21T10:00:00', '2030-01-21T10:46:00', 'A reserva nesta sala deve durar no máximo 45min.'],
  ])('rejects one minute over a %s room', async (maxDuration, startAt, endAt, message) => {
    const res = await reserveIn(maxDuration, startAt, endAt);
    expect(res.status).toBe(400);
    expect(errorResponseSchema.parse(res.body).details).toEqual({ endAt: [message] });
  });

  it('lets a long room go past the old 4-hour limit', async () => {
    expect((await reserveIn('08:00', '2030-01-21T09:00:00', '2030-01-21T15:00:00')).status).toBe(201);
  });

  it('keeps the 15-minute minimum for every room', async () => {
    const res = await reserveIn('08:00', '2030-01-21T10:00:00', '2030-01-21T10:10:00');
    expect(res.status).toBe(400);
    expect(errorResponseSchema.parse(res.body).details?.endAt).toEqual(['A reserva deve durar pelo menos 15 minutos.']);
  });

  it('translates the limit with its value', async () => {
    const res = await reserveIn('02:00', '2030-01-21T10:00:00', '2030-01-21T13:00:00', 'en');
    expect(errorResponseSchema.parse(res.body).details).toEqual({ endAt: ['reservation must last at most 2h in this room'] });
  });

  it("applies the room's current limit: after lowering it, longer new bookings are refused", async () => {
    const user = userFactory.create(ctx.db);
    const room = roomFactory.create(ctx.db, { maxDuration: '04:00' });
    // fits the lower limit below, so lowering is allowed
    await ctx.api.post('/reservations/create').send({ userId: user.id, roomId: room.id, startAt: '2030-01-21T10:00:00', endAt: '2030-01-21T11:00:00' }).expect(201);

    const admin = adminFactory.create(ctx.db);
    await ctx.api.patch(`/rooms/edit/${room.id}`).send({ userId: admin.id, maxDuration: '01:00' }).expect(200);

    await ctx.api.post('/reservations/create').send({ userId: user.id, roomId: room.id, startAt: '2030-01-22T10:00:00', endAt: '2030-01-22T13:00:00' }).expect(400);
  });
});

describe('POST /reservations/create: room maxDuration (SALA-6) and business hours (SALA-5) together', () => {
  const ctx = useTestApp({ now: () => NOW });

  const book = (maxDuration: string, startAt: string, endAt: string) => {
    const user = userFactory.create(ctx.db);
    const room = roomFactory.create(ctx.db, { maxDuration });
    return ctx.api.post('/reservations/create').send({ userId: user.id, roomId: room.id, startAt, endAt });
  };

  it('accepts a booking that respects both: 8h in an 08:00 room, on a Monday 09:00–17:00', async () => {
    await book('08:00', '2030-01-21T09:00:00', '2030-01-21T17:00:00').expect(201);
  });

  it("rejects a booking inside business hours that exceeds the room's maximum", async () => {
    const res = await book('01:00', '2030-01-21T09:00:00', '2030-01-21T11:00:00').expect(400);
    expect(errorResponseSchema.parse(res.body).details).toEqual({ endAt: ['A reserva nesta sala deve durar no máximo 1h.'] });
  });

  it("rejects a booking within the room's maximum on a weekend", async () => {
    const res = await book('08:00', '2030-01-26T09:00:00', '2030-01-26T10:00:00').expect(400);
    expect(errorResponseSchema.parse(res.body).details?.startAt).toEqual(['Reservas só podem ser feitas em dias úteis (segunda a sexta).']);
  });

  it("rejects a booking within the room's maximum that runs past 20:00", async () => {
    const res = await book('08:00', '2030-01-21T18:00:00', '2030-01-21T21:00:00').expect(400);
    expect(errorResponseSchema.parse(res.body).details?.endAt).toEqual(['Reservas só podem acontecer das 08:00 às 20:00.']);
  });

  it('caps every room at the 12-hour business day, whatever its maxDuration', async () => {
    await book('23:59', '2030-01-21T08:00:00', '2030-01-21T20:00:00').expect(201);
    const res = await book('23:59', '2030-01-22T07:00:00', '2030-01-22T20:00:00').expect(400);
    expect(errorResponseSchema.parse(res.body).details?.startAt).toEqual(['Reservas só podem acontecer das 08:00 às 20:00.']);
  });
});
