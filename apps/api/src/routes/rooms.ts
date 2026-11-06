import { Router } from 'express';

import { validate } from '../middlewares/validate';
import type { RoomsController } from '../controllers/rooms';
import { emptySchema as noParams, emptySchema as noQuery } from '../schemas/common';
import {
  createRoomBodySchema,
  deleteRoomBodySchema,
  editRoomBodySchema,
  listRoomsQuerySchema,
  roomIdParamsSchema,
} from '../schemas/room';

/** Create, edit and delete take the caller's userId in the body; only admins may use them (403). */
export function createRoomsRouter(controller: RoomsController): Router {
  const router = Router();

  router.post('/rooms/create', validate({ params: noParams, query: noQuery, body: createRoomBodySchema }), controller.create);
  router.patch(
    '/rooms/edit/:id',
    validate({ params: roomIdParamsSchema, query: noQuery, body: editRoomBodySchema }),
    controller.edit,
  );
  router.delete(
    '/rooms/delete/:id',
    validate({ params: roomIdParamsSchema, query: noQuery, body: deleteRoomBodySchema }),
    controller.delete,
  );
  router.get('/rooms/find/:id', validate({ params: roomIdParamsSchema, query: noQuery }), controller.find);
  router.get('/rooms/list', validate({ params: noParams, query: listRoomsQuerySchema }), controller.list);
  router.get('/rooms/resources', validate({ params: noParams, query: noQuery }), controller.listResources);

  return router;
}
