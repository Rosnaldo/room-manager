/**
 * Type-level contract tests (checked by tsc via `vitest --typecheck`, never executed).
 * They fail the build if a zod schema's inferred type drifts from the type the controller declares.
 */
import { describe, expectTypeOf, it } from 'vitest';
import type { z } from 'zod';
import type { IRoom } from '@repo/shared-types';

import type {
  CreateRoomBody,
  ListRoomResourcesResponse,
  ListRoomsQuery,
  ListRoomsResponse,
  RoomResponse,
  RoomsController,
} from '../../src/controllers/rooms';
import type { NoParams, NoQuery } from '../../src/controllers/users';
import {
  type createRoomBodySchema,
  type listRoomsQuerySchema,
  type listRoomResourcesResponseSchema,
  type listRoomsResponseSchema,
  type roomResponseSchema,
} from '../../src/schemas/room';
import { type emptySchema } from '../../src/schemas/common';
import type { Contract, Jsonify } from '../helpers/types';

describe('zod input schemas infer the controller request types', () => {
  it('POST /rooms/create', () => {
    type C = Contract<RoomsController['create']>;
    expectTypeOf<z.output<typeof createRoomBodySchema>>().toEqualTypeOf<C['body']>();
    expectTypeOf<z.output<typeof createRoomBodySchema>>().toEqualTypeOf<CreateRoomBody>();
    expectTypeOf<z.output<typeof emptySchema>>().toEqualTypeOf<C['params']>();
    expectTypeOf<z.output<typeof emptySchema>>().toEqualTypeOf<C['query']>();
    // resources may be omitted by clients; the schema defaults it
    expectTypeOf<z.input<typeof createRoomBodySchema>>().toEqualTypeOf<{ name: string; capacity: number; resources?: string[] }>();
  });

  it('GET /rooms/list', () => {
    type C = Contract<RoomsController['list']>;
    expectTypeOf<z.output<typeof listRoomsQuerySchema>>().toEqualTypeOf<C['query']>();
    expectTypeOf<z.output<typeof listRoomsQuerySchema>>().toEqualTypeOf<ListRoomsQuery>();
    expectTypeOf<C['params']>().toEqualTypeOf<NoParams>();
    expectTypeOf<Contract<RoomsController['create']>['query']>().toEqualTypeOf<NoQuery>();
    // filters arrive as strings (or repeated keys) in the URL
    expectTypeOf<z.input<typeof listRoomsQuerySchema>['resources']>().toEqualTypeOf<string | string[] | undefined>();
  });

  it('GET /rooms/resources', () => {
    type C = Contract<RoomsController['listResources']>;
    expectTypeOf<C['params']>().toEqualTypeOf<NoParams>();
    expectTypeOf<C['query']>().toEqualTypeOf<NoQuery>();
  });
});

describe('zod output schemas match the controller response types', () => {
  it('room response (create) is the shared IRoom', () => {
    expectTypeOf<z.output<typeof roomResponseSchema>>().toEqualTypeOf<RoomResponse>();
    expectTypeOf<z.output<typeof roomResponseSchema>>().toEqualTypeOf<IRoom>();
    expectTypeOf<Contract<RoomsController['create']>['response']>().toEqualTypeOf<RoomResponse>();
  });

  it('list response', () => {
    expectTypeOf<z.output<typeof listRoomsResponseSchema>>().toEqualTypeOf<ListRoomsResponse>();
    expectTypeOf<Contract<RoomsController['list']>['response']>().toEqualTypeOf<ListRoomsResponse>();
  });

  it('resources response', () => {
    expectTypeOf<z.output<typeof listRoomResourcesResponseSchema>>().toEqualTypeOf<ListRoomResourcesResponse>();
    expectTypeOf<Contract<RoomsController['listResources']>['response']>().toEqualTypeOf<ListRoomResourcesResponse>();
  });

  it('wire format (schema input) is the JSON-serialized response', () => {
    expectTypeOf<z.input<typeof roomResponseSchema>>().toEqualTypeOf<Jsonify<RoomResponse>>();
    expectTypeOf<z.input<typeof listRoomsResponseSchema>>().toEqualTypeOf<Jsonify<ListRoomsResponse>>();
  });
});
