import { describe, expect, it } from 'vitest';

import { useTestApp } from '../helpers/app';
import { userFactory } from '../factories/user.factory';
import { errorResponseSchema } from '../../src/schemas/common';
import { UserRepository } from '../../src/repositories/user';

describe('DELETE /users/delete/:id', () => {
  const ctx = useTestApp();

  it('deletes the user and returns 204 with no body', async () => {
    const [user, other] = userFactory.createMany(ctx.db, 2);

    const res = await ctx.api.delete(`/users/delete/${user.id}`).expect(204);

    expect(res.body).toEqual({});
    const repo = new UserRepository(ctx.db);
    expect(repo.findById(user.id)).toBeUndefined();
    expect(repo.findById(other.id)).toEqual(other);
  });

  it('returns 404 for a missing user', async () => {
    const res = await ctx.api.delete('/users/delete/999').expect(404);
    expect(errorResponseSchema.parse(res.body)).toEqual({ message: 'Usuário 999 não encontrado.' });
  });

  it('returns 400 for an invalid id', async () => {
    const res = await ctx.api.delete('/users/delete/abc').expect(400);
    expect(errorResponseSchema.parse(res.body).details).toHaveProperty('id');
  });
});
