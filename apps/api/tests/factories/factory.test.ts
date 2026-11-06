import { describe, expect, it } from 'vitest';

import { createTestDb } from '../helpers/db';
import { UserRepository } from '../../src/repositories/user';
import { adminFactory, userFactory } from './user.factory';

describe('Factory', () => {
  it('builds unique defaults on every call', () => {
    const [a, b] = userFactory.buildMany(2);
    expect(a.email).not.toEqual(b.email);
    expect(a.role).toBe('customer');
  });

  it('applies static and sequence-based overrides', () => {
    expect(userFactory.build({ firstName: 'Ana', email: undefined })).toMatchObject({ firstName: 'Ana', email: undefined });
    expect(userFactory.build((n) => ({ lastName: `L-${n}` })).lastName).toMatch(/^L-\d+$/);
  });

  it('derives traits with extend()', () => {
    expect(adminFactory.build().role).toBe('admin');
    expect(adminFactory.build({ role: 'customer' }).role).toBe('customer');
  });

  it('persists into the given in-memory database only', () => {
    const db1 = createTestDb();
    const db2 = createTestDb();

    const user = userFactory.create(db1, { firstName: 'Persisted' });

    expect(new UserRepository(db1).findById(user.id)).toEqual(user);
    expect(new UserRepository(db2).findById(user.id)).toBeUndefined();
  });
});
