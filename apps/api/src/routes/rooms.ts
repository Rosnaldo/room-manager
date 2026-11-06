import { Router } from 'express';

import { validate } from '../middlewares/validate';
import type { RoomsController } from '../controllers/rooms';
import { emptySchema as noParams, emptySchema as noQuery } from '../schemas/common';
import { createRoomBodySchema, listRoomsQuerySchema } from '../schemas/room';

export function createRoomsRouter(controller: RoomsController): Router {
  const router = Router();

  router.post('/rooms/create', validate({ params: noParams, query: noQuery, body: createRoomBodySchema }), controller.create);
  router.get('/rooms/list', validate({ params: noParams, query: listRoomsQuerySchema }), controller.list);
  router.get('/rooms/resources', validate({ params: noParams, query: noQuery }), controller.listResources);

  return router;
}
