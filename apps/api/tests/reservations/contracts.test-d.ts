/**
 * Type-level contract tests (checked by tsc via `vitest --typecheck`, never executed).
 * They fail the build if a zod schema's inferred type drifts from the type the controller declares.
 */
import { describe, expectTypeOf, it } from 'vitest';
import type { z } from 'zod';
import type { IReservedRoom } from '@repo/shared-types';

import type {
  CreateReservedRoomBody,
  ReservedRoomResponse,
  ReservedRoomsController,
} from '../../src/controllers/reserved_rooms';
import type { NoParams, NoQuery } from '../../src/controllers/users';
import {
  type createReservedRoomBodySchema,
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
});

describe('zod output schemas match the controller response types', () => {
  it('reservation response is the shared IReservedRoom', () => {
    expectTypeOf<z.output<typeof reservedRoomResponseSchema>>().toEqualTypeOf<ReservedRoomResponse>();
    expectTypeOf<z.output<typeof reservedRoomResponseSchema>>().toEqualTypeOf<IReservedRoom>();
  });

  it('wire format (schema input) is the JSON-serialized response', () => {
    expectTypeOf<z.input<typeof reservedRoomResponseSchema>>().toEqualTypeOf<Jsonify<ReservedRoomResponse>>();
  });
});
