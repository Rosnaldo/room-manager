import { Router } from 'express';

import { validate } from '../middlewares/validate';
import type { UsersController } from '../controllers/users';
import { emptySchema as noParams, emptySchema as noQuery } from '../schemas/common';
import {
  createUserBodySchema,
  editUserBodySchema,
  listUsersQuerySchema,
  userIdParamsSchema,
} from '../schemas/user';

export function createUsersRouter(controller: UsersController): Router {
  const router = Router();

  router.post('/users/create', validate({ params: noParams, query: noQuery, body: createUserBodySchema }), controller.create);
  router.get('/users/list', validate({ params: noParams, query: listUsersQuerySchema }), controller.list);
  router.get('/users/find/:id', validate({ params: userIdParamsSchema, query: noQuery }), controller.find);
  router.patch('/users/edit/:id', validate({ params: userIdParamsSchema, query: noQuery, body: editUserBodySchema }), controller.edit);
  router.delete('/users/delete/:id', validate({ params: userIdParamsSchema, query: noQuery }), controller.delete);

  return router;
}
