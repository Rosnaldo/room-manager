import { Router } from 'express';

import { validate } from '../middlewares/validate';
import type { ReservedRoomsController } from '../controllers/reserved_rooms';
import { emptySchema as noParams, emptySchema as noQuery } from '../schemas/common';
import {
  createReservedRoomBodySchema,
  deleteReservedRoomBodySchema,
  listReservedRoomsQuerySchema,
  reservedRoomIdParamsSchema,
} from '../schemas/reserved_room';

export function createReservedRoomsRouter(controller: ReservedRoomsController): Router {
  const router = Router();

  router.post(
    '/reservations/create',
    validate({ params: noParams, query: noQuery, body: createReservedRoomBodySchema }),
    controller.create,
  );
  router.get('/reservations/list', validate({ params: noParams, query: listReservedRoomsQuerySchema }), controller.list);
  router.delete(
    '/reservations/delete/:id',
    validate({ params: reservedRoomIdParamsSchema, query: noQuery, body: deleteReservedRoomBodySchema }),
    controller.delete,
  );

  return router;
}
