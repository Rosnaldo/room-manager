import { Router } from 'express';

import { validate } from '../middlewares/validate';
import type { ReservedRoomsController } from '../controllers/reserved_rooms';
import { emptySchema as noParams, emptySchema as noQuery } from '../schemas/common';
import { createReservedRoomBodySchema } from '../schemas/reserved_room';

export function createReservedRoomsRouter(controller: ReservedRoomsController): Router {
  const router = Router();

  router.post(
    '/reservations/create',
    validate({ params: noParams, query: noQuery, body: createReservedRoomBodySchema }),
    controller.create,
  );

  return router;
}
