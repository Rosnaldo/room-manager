import type { IUser } from '@repo/shared-types';

import type { NewUserRow } from '../../src/db/schema';
import { UserRepository } from '../../src/repositories/user';
import type { CreateUserBody, EditUserBody } from '../../src/controllers/users';
import { Factory } from './factory';

/** Persisted user entity. Any column (incl. id/createdAt) can be overridden. */
export const userFactory = new Factory<NewUserRow, IUser>({
  defaults: (n) => ({
    firstName: `First${n}`,
    lastName: `Last${n}`,
    email: `user${n}@example.com`,
    role: 'customer',
  }),
  persist: (db, attrs) => new UserRepository(db).create(attrs),
});

export const adminFactory = userFactory.extend({ role: 'admin' });

/** Request payloads (not persisted). */
export const createUserBodyFactory = new Factory<CreateUserBody>({
  defaults: (n) => ({
    firstName: `New${n}`,
    lastName: `Person${n}`,
    email: `new${n}@example.com`,
    role: 'customer',
  }),
});

export const editUserBodyFactory = new Factory<EditUserBody>({
  defaults: (n) => ({ firstName: `Edited${n}` }),
});
