import express, { type Express } from 'express';
import cors from 'cors';

import properties from './properties';
import type { DB } from './db/connection';
import { errorHandler } from './middlewares/error_handler';
import { UserRepository } from './repositories/user';
import { createUsersController } from './controllers/users';
import { RoomRepository } from './repositories/room';
import { createRoomsController } from './controllers/rooms';
import { createHealthRouter } from './routes/health';
import { createUsersRouter } from './routes/users';
import { createRoomsRouter } from './routes/rooms';

/** Builds the express app around a given database, so tests can inject an in-memory one. */
export function createApp(db: DB): Express {
  const app = express();
  app.use(cors({ origin: properties.webOrigins }));
  app.use(express.json());

  app.use(createHealthRouter(db));
  app.use(createUsersRouter(createUsersController(new UserRepository(db))));
  app.use(createRoomsRouter(createRoomsController(new RoomRepository(db))));

  app.use(errorHandler);
  return app;
}
