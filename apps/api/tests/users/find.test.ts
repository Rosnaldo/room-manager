import { describe, expect, it } from 'vitest';

import { useTestApp } from '../helpers/app';
import { userFactory } from '../factories/user.factory';
import { userResponseSchema } from '../../src/schemas/user';
import { errorResponseSchema } from '../../src/schemas/common';

describe('GET /users/find/:id', () => {
  const ctx = useTestApp();

  it('returns the user matching the response schema', async () => {
    const user = userFactory.create(ctx.db, { firstName: 'Ana' });
    const res = await ctx.api.get(`/users/find/${user.id}`).expect(200);
    expect(userResponseSchema.parse(res.body)).toEqual(user);
  });

  it('returns 404 for a missing user', async () => {
    const res = await ctx.api.get('/users/find/999').expect(404);
    expect(errorResponseSchema.parse(res.body)).toEqual({ message: 'Usuário 999 não encontrado.' });
  });

  it.each(['abc', '0', '-1', '1.5'])('returns 400 for id=%s', async (id) => {
    const res = await ctx.api.get(`/users/find/${id}`).expect(400);
    const error = errorResponseSchema.parse(res.body);
    expect(error.message).toBe('Parâmetros da URL inválidos.');
    expect(error.details).toHaveProperty('id');
  });
});
