import { Router } from 'express';

import type { CurrentUserMiddleware } from '../middlewares/current_user';

import { validate } from '../middlewares/validate';
import type { ReservedRoomsController } from '../controllers/reserved_rooms';
import { emptySchema as noParams, emptySchema as noQuery } from '../schemas/common';
import {
  createReservedRoomBodySchema,
  listReservedRoomsQuerySchema,
  reservedRoomIdParamsSchema,
} from '../schemas/reserved_room';

/** `currentUser`: identifies the caller (X-User-Id) for the endpoints that act on their own data. */
export function createReservedRoomsRouter(controller: ReservedRoomsController, currentUser: CurrentUserMiddleware): Router {
  const router = Router();

  router.post(
    '/reservations/create',
    validate({ params: noParams, query: noQuery, body: createReservedRoomBodySchema }),
    controller.create,
  );
  router.get(
    '/reservations/list',
    validate({ params: noParams, query: listReservedRoomsQuerySchema }),
    currentUser,
    controller.list,
  );
  router.delete(
    '/reservations/delete/:id',
    validate({ params: reservedRoomIdParamsSchema, query: noQuery }),
    currentUser,
    controller.delete,
  );

  return router;
}
