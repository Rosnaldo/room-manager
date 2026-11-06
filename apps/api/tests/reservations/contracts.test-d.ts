/**
 * Type-level contract tests (checked by tsc via `vitest --typecheck`, never executed).
 * They fail the build if a zod schema's inferred type drifts from the type the controller declares.
 */
import { describe, expectTypeOf, it } from 'vitest';
import type { z } from 'zod';
import type { IReservedRoom } from '@repo/shared-types';

import type {
  CreateReservedRoomBody,
  DeleteReservedRoomBody,
  ListReservedRoomsQuery,
  ListReservedRoomsResponse,
  ReservedRoomIdParams,
  ReservedRoomResponse,
  ReservedRoomsController,
} from '../../src/controllers/reserved_rooms';
import type { NoParams, NoQuery } from '../../src/controllers/users';
import {
  type createReservedRoomBodySchema,
  type deleteReservedRoomBodySchema,
  type listReservedRoomsQuerySchema,
  type listReservedRoomsResponseSchema,
  type reservedRoomIdParamsSchema,
  type reservedRoomResponseSchema,
} from '../../src/schemas/reserved_room';
import type { Contract, Jsonify } from '../helpers/types';

describe('zod input schemas infer the controller request types', () => {
  it('POST /reservations/create', () => {
    type C = Contract<ReservedRoomsController['create']>;
    expectTypeOf<z.output<typeof createReservedRoomBodySchema>>().toEqualTypeOf<C['body']>();
    expectTypeOf<z.output<typeof createReservedRoomBodySchema>>().toEqualTypeOf<CreateReservedRoomBody>();
    expectTypeOf<C['params']>().toEqualTypeOf<NoParams>();
    expectTypeOf<C['query']>().toEqualTypeOf<NoQuery>();
  });

  it('GET /reservations/list', () => {
    type C = Contract<ReservedRoomsController['list']>;
    expectTypeOf<z.output<typeof listReservedRoomsQuerySchema>>().toEqualTypeOf<C['query']>();
    expectTypeOf<z.output<typeof listReservedRoomsQuerySchema>>().toEqualTypeOf<ListReservedRoomsQuery>();
    expectTypeOf<C['params']>().toEqualTypeOf<NoParams>();
  });

  it('DELETE /reservations/delete/:id', () => {
    type C = Contract<ReservedRoomsController['delete']>;
    expectTypeOf<z.output<typeof reservedRoomIdParamsSchema>>().toEqualTypeOf<C['params']>();
    expectTypeOf<z.output<typeof reservedRoomIdParamsSchema>>().toEqualTypeOf<ReservedRoomIdParams>();
    expectTypeOf<C['query']>().toEqualTypeOf<NoQuery>();
    expectTypeOf<z.output<typeof deleteReservedRoomBodySchema>>().toEqualTypeOf<C['body']>();
    expectTypeOf<z.output<typeof deleteReservedRoomBodySchema>>().toEqualTypeOf<DeleteReservedRoomBody>();
    expectTypeOf<C['response']>().toEqualTypeOf<void>();
  });
});

describe('zod output schemas match the controller response types', () => {
  it('reservation response is the shared IReservedRoom', () => {
    expectTypeOf<z.output<typeof reservedRoomResponseSchema>>().toEqualTypeOf<ReservedRoomResponse>();
    expectTypeOf<z.output<typeof reservedRoomResponseSchema>>().toEqualTypeOf<IReservedRoom>();
  });

  it('list response', () => {
    expectTypeOf<z.output<typeof listReservedRoomsResponseSchema>>().toEqualTypeOf<ListReservedRoomsResponse>();
    expectTypeOf<Contract<ReservedRoomsController['list']>['response']>().toEqualTypeOf<ListReservedRoomsResponse>();
  });

  it('wire format (schema input) is the JSON-serialized response', () => {
    expectTypeOf<z.input<typeof reservedRoomResponseSchema>>().toEqualTypeOf<Jsonify<ReservedRoomResponse>>();
  });
});
