import { describe, expect, it } from 'vitest';

import { useTestApp } from '../helpers/app';
import { createUserBodyFactory, userFactory } from '../factories/user.factory';
import { createUserBodySchema, userResponseSchema } from '../../src/schemas/user';
import { errorResponseSchema } from '../../src/schemas/common';
import { UserRepository } from '../../src/repositories/user';

describe('POST /users/create', () => {
  const ctx = useTestApp();

  it('creates a user and returns a body matching the response schema', async () => {
    const body = createUserBodyFactory.build({ email: '  Mixed.Case@Example.COM ' });
    expect(createUserBodySchema.safeParse(body).success).toBe(true);

    const res = await ctx.api.post('/users/create').send(body).expect(201);

    const user = userResponseSchema.parse(res.body);
    expect(user).toMatchObject({ firstName: body.firstName, lastName: body.lastName, role: body.role, email: 'mixed.case@example.com' });
    expect(new UserRepository(ctx.db).findById(user.id)).toEqual(user);
  });

  it('accepts a user without email (omitted from response)', async () => {
    const res = await ctx.api.post('/users/create').send(createUserBodyFactory.build({ email: undefined })).expect(201);
    const user = userResponseSchema.parse(res.body);
    expect(user).not.toHaveProperty('email');
  });

  it('returns 409 when the email is taken', async () => {
    const existing = userFactory.create(ctx.db);
    const res = await ctx.api.post('/users/create').send(createUserBodyFactory.build({ email: existing.email })).expect(409);
    expect(errorResponseSchema.parse(res.body).message).toMatch(/já está em uso/);
  });

  it.each([
    ['missing firstName', { firstName: undefined }, 'firstName'],
    ['blank lastName', { lastName: '   ' }, 'lastName'],
    ['invalid email', { email: 'not-an-email' }, 'email'],
    ['unknown role', { role: 'boss' }, 'role'],
  ])('returns 400 for %s', async (_case, override, field) => {
    const body = { ...createUserBodyFactory.build(), ...override };
    expect(createUserBodySchema.safeParse(body).success).toBe(false);

    const res = await ctx.api.post('/users/create').send(body).expect(400);
    const error = errorResponseSchema.parse(res.body);
    expect(error.message).toBe('Dados inválidos.');
    expect(error.details).toHaveProperty(field);
  });

  it('rejects unknown fields such as id', async () => {
    const res = await ctx.api.post('/users/create').send({ ...createUserBodyFactory.build(), id: 99 }).expect(400);
    expect(errorResponseSchema.parse(res.body).details?._errors?.[0]).toMatch(/Campo não permitido/);
  });

  it('rejects query params', async () => {
    const res = await ctx.api.post('/users/create?foo=bar').send(createUserBodyFactory.build()).expect(400);
    expect(errorResponseSchema.parse(res.body)).toMatchObject({ message: 'Parâmetros de consulta inválidos.', details: { foo: expect.any(Array) } });
  });
});
