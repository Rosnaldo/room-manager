import { describe, expect, it } from 'vitest';

import { useTestApp } from '../helpers/app';
import { editUserBodyFactory, userFactory } from '../factories/user.factory';
import { editUserBodySchema, userResponseSchema } from '../../src/schemas/user';
import { errorResponseSchema } from '../../src/schemas/common';
import { UserRepository } from '../../src/repositories/user';

describe('PATCH /users/edit/:id', () => {
  const ctx = useTestApp();

  it('updates only the provided fields', async () => {
    const user = userFactory.create(ctx.db, { createdAt: new Date(Date.UTC(2026, 0, 1)) });
    const body = editUserBodyFactory.build({ role: 'admin' });

    const res = await ctx.api.patch(`/users/edit/${user.id}`).send(body).expect(200);

    const updated = userResponseSchema.parse(res.body);
    expect(updated).toMatchObject({ ...user, firstName: body.firstName, role: 'admin', updatedAt: expect.any(Date) });
    expect(updated.updatedAt.getTime()).toBeGreaterThan(user.updatedAt.getTime());
    expect(new UserRepository(ctx.db).findById(user.id)).toEqual(updated);
  });

  it('clears the email with null', async () => {
    const user = userFactory.create(ctx.db);
    const res = await ctx.api.patch(`/users/edit/${user.id}`).send({ email: null }).expect(200);
    expect(userResponseSchema.parse(res.body)).not.toHaveProperty('email');
  });

  it('allows keeping its own email but not taking another user\'s', async () => {
    const [user, other] = userFactory.createMany(ctx.db, 2);

    await ctx.api.patch(`/users/edit/${user.id}`).send({ email: user.email }).expect(200);

    const res = await ctx.api.patch(`/users/edit/${user.id}`).send({ email: other.email }).expect(409);
    expect(errorResponseSchema.parse(res.body).message).toMatch(/already in use/);
  });

  it('returns 404 for a missing user', async () => {
    await ctx.api.patch('/users/edit/999').send(editUserBodyFactory.build()).expect(404);
  });

  it.each([
    ['empty body', {}, '_errors'],
    ['unknown field', { id: 5 }, '_errors'],
    ['blank firstName', { firstName: '' }, 'firstName'],
    ['invalid email', { email: 'nope' }, 'email'],
    ['unknown role', { role: 'boss' }, 'role'],
  ])('returns 400 for %s', async (_case, body, field) => {
    expect(editUserBodySchema.safeParse(body).success).toBe(false);

    const user = userFactory.create(ctx.db);
    const res = await ctx.api.patch(`/users/edit/${user.id}`).send(body).expect(400);
    const error = errorResponseSchema.parse(res.body);
    expect(error.message).toBe('invalid request body');
    expect(error.details).toHaveProperty(field);
  });

  it('returns 400 for an invalid id before checking the body', async () => {
    const res = await ctx.api.patch('/users/edit/abc').send({}).expect(400);
    expect(errorResponseSchema.parse(res.body).message).toBe('invalid path params');
  });
});
