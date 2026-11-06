import { beforeEach, describe, expect, it } from 'vitest';
import type { IRoom, IUser } from '@repo/shared-types';

import { useTestApp } from '../helpers/app';
import { roomFactory } from '../factories/room.factory';
import { reservedRoomFactory } from '../factories/reserved_room.factory';
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
    const res = await patchAs(admin, { name: 'Sala Ipê Grande', maxCapacity: 20, maxDuration: '01:30', resources: ['tv'] }).expect(200);
    const updated = roomResponseSchema.parse(res.body);
    expect(updated).toEqual({ id: room.id, name: 'Sala Ipê Grande', maxCapacity: 20, maxDuration: '01:30', resources: ['tv'] });
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
    ['invalid maxDuration', { maxDuration: '1:30' }, 'maxDuration'],
    ['maxDuration under 15 minutes', { maxDuration: '00:10' }, 'maxDuration'],
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

describe('PATCH /rooms/edit/:id lowering maxDuration below existing reservations', () => {
  // 12:00 UTC = 09:00 in America/Sao_Paulo
  const ctx = useTestApp({ now: () => new Date('2030-01-15T12:00:00Z') });
  let admin: IUser;
  let customer: IUser;
  let room: IRoom;

  beforeEach(() => {
    admin = adminFactory.create(ctx.db);
    customer = userFactory.create(ctx.db);
    room = roomFactory.create(ctx.db, { maxDuration: '04:00' });
  });

  const reserve = (startAt: string, endAt: string, roomId = room.id) =>
    reservedRoomFactory.create(ctx.db, { userId: customer.id, roomId, startAt, endAt });
  const setMax = (maxDuration: string, lang?: string) => {
    const req = ctx.api.patch(`/rooms/edit/${room.id}`);
    if (lang) req.set('Accept-Language', lang);
    return req.send({ userId: admin.id, maxDuration });
  };
  const storedMax = () => new RoomRepository(ctx.db).findById(room.id)?.maxDuration;

  it('refuses when an upcoming reservation is longer, and changes nothing', async () => {
    reserve('2030-01-21T10:00:00', '2030-01-21T13:00:00'); // 3h

    const res = await setMax('02:00').expect(409);
    expect(errorResponseSchema.parse(res.body).message).toBe(
      'Não é possível reduzir a duração máxima para 2h: 1 reserva(s) futura(s) duram mais que isso. Cancele-as ou escolha uma duração maior.',
    );
    expect(storedMax()).toBe('04:00');
  });

  it('counts every longer reservation', async () => {
    reserve('2030-01-21T10:00:00', '2030-01-21T13:00:00'); // 3h
    reserve('2030-01-22T10:00:00', '2030-01-22T12:30:00'); // 2h30
    reserve('2030-01-23T10:00:00', '2030-01-23T11:00:00'); // 1h, fits
    const res = await setMax('02:00', 'en').expect(409);
    expect(res.body).toEqual({ message: 'cannot lower the maximum duration to 2h: 2 upcoming reservation(s) last longer' });
  });

  it('allows a limit equal to the longest reservation', async () => {
    reserve('2030-01-21T10:00:00', '2030-01-21T13:00:00'); // 3h
    await setMax('03:00').expect(200);
    expect(storedMax()).toBe('03:00');
  });

  it('allows it when every reservation fits', async () => {
    reserve('2030-01-21T10:00:00', '2030-01-21T11:00:00');
    await setMax('01:00').expect(200);
  });

  it('ignores reservations that already ended', async () => {
    reserve('2030-01-14T09:00:00', '2030-01-14T13:00:00'); // 4h, yesterday
    await setMax('01:00').expect(200);
  });

  it('counts a reservation in progress', async () => {
    reserve('2030-01-15T08:00:00', '2030-01-15T11:00:00'); // 3h, started at 08:00, now is 09:00
    await setMax('02:00').expect(409);
  });

  it("ignores other rooms' reservations", async () => {
    const other = roomFactory.create(ctx.db, { maxDuration: '04:00' });
    reserve('2030-01-21T10:00:00', '2030-01-21T14:00:00', other.id);
    await setMax('01:00').expect(200);
  });

  it('measures reservations that cross midnight', async () => {
    reserve('2030-01-21T23:00:00', '2030-01-22T02:00:00'); // 3h
    await setMax('02:30').expect(409);
    await setMax('03:00').expect(200);
  });

  it('always allows raising the limit', async () => {
    reserve('2030-01-21T10:00:00', '2030-01-21T14:00:00');
    await setMax('08:00').expect(200);
  });

  it('checks nothing when maxDuration is not being changed', async () => {
    ctx.db.$client.prepare("update rooms set max_duration = '01:00' where id = ?").run(room.id);
    reserve('2030-01-21T10:00:00', '2030-01-21T14:00:00'); // 4h, longer than the room's 1h (inserted directly)
    await ctx.api.patch(`/rooms/edit/${room.id}`).send({ userId: admin.id, maxCapacity: 20 }).expect(200);
  });
});
