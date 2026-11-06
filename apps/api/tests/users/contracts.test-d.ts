/**
 * Type-level contract tests (checked by tsc via `vitest --typecheck`, never executed).
 * They fail the build if a zod schema's inferred type drifts from the type the controller declares.
 */
import { describe, expectTypeOf, it } from 'vitest';
import type { z } from 'zod';

import type {
  CreateUserBody,
  EditUserBody,
  ListUsersQuery,
  ListUsersResponse,
  NoParams,
  NoQuery,
  UserIdParams,
  UserResponse,
  UsersController,
} from '../../src/controllers/users';
import {
  type createUserBodySchema,
  type editUserBodySchema,
  type listUsersQuerySchema,
  type listUsersResponseSchema,
  type userIdParamsSchema,
  type userResponseSchema,
} from '../../src/schemas/user';
import { type emptySchema } from '../../src/schemas/common';
import type { Contract, Jsonify } from '../helpers/types';

describe('zod input schemas infer the controller request types', () => {
  it('POST /users/create', () => {
    type C = Contract<UsersController['create']>;
    expectTypeOf<z.output<typeof createUserBodySchema>>().toEqualTypeOf<C['body']>();
    expectTypeOf<z.output<typeof createUserBodySchema>>().toEqualTypeOf<CreateUserBody>();
    expectTypeOf<z.output<typeof emptySchema>>().toEqualTypeOf<C['params']>();
    expectTypeOf<z.output<typeof emptySchema>>().toEqualTypeOf<C['query']>();
  });

  it('GET /users/list', () => {
    type C = Contract<UsersController['list']>;
    expectTypeOf<z.output<typeof listUsersQuerySchema>>().toEqualTypeOf<C['query']>();
    expectTypeOf<z.output<typeof listUsersQuerySchema>>().toEqualTypeOf<ListUsersQuery>();
    expectTypeOf<C['params']>().toEqualTypeOf<NoParams>();
  });

  it('GET /users/find/:id', () => {
    type C = Contract<UsersController['find']>;
    expectTypeOf<z.output<typeof userIdParamsSchema>>().toEqualTypeOf<C['params']>();
    expectTypeOf<z.output<typeof userIdParamsSchema>>().toEqualTypeOf<UserIdParams>();
    expectTypeOf<C['query']>().toEqualTypeOf<NoQuery>();
  });

  it('PATCH /users/edit/:id', () => {
    type C = Contract<UsersController['edit']>;
    expectTypeOf<z.output<typeof editUserBodySchema>>().toEqualTypeOf<C['body']>();
    expectTypeOf<z.output<typeof editUserBodySchema>>().toEqualTypeOf<EditUserBody>();
    expectTypeOf<z.output<typeof userIdParamsSchema>>().toEqualTypeOf<C['params']>();
  });

  it('DELETE /users/delete/:id', () => {
    type C = Contract<UsersController['delete']>;
    expectTypeOf<z.output<typeof userIdParamsSchema>>().toEqualTypeOf<C['params']>();
    expectTypeOf<C['response']>().toEqualTypeOf<void>();
  });
});

describe('zod output schemas match the controller response types', () => {
  it('user responses (create/find/edit)', () => {
    expectTypeOf<z.output<typeof userResponseSchema>>().toEqualTypeOf<UserResponse>();
    expectTypeOf<Contract<UsersController['create']>['response']>().toEqualTypeOf<UserResponse>();
    expectTypeOf<Contract<UsersController['find']>['response']>().toEqualTypeOf<UserResponse>();
    expectTypeOf<Contract<UsersController['edit']>['response']>().toEqualTypeOf<UserResponse>();
  });

  it('list response', () => {
    expectTypeOf<z.output<typeof listUsersResponseSchema>>().toEqualTypeOf<ListUsersResponse>();
    expectTypeOf<Contract<UsersController['list']>['response']>().toEqualTypeOf<ListUsersResponse>();
  });

  it('wire format (schema input) is the JSON-serialized response', () => {
    expectTypeOf<z.input<typeof userResponseSchema>>().toEqualTypeOf<Jsonify<UserResponse>>();
    expectTypeOf<z.input<typeof listUsersResponseSchema>>().toEqualTypeOf<Jsonify<ListUsersResponse>>();
  });
});
