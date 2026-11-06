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
import { ReservedRoomRepository } from './repositories/reserved_room';
import { createReservedRoomsController } from './controllers/reserved_rooms';
import { createReservedRoomsRouter } from './routes/reserved_rooms';
import { requireCurrentUser } from './middlewares/current_user';

export interface AppOptions {
  /** clock for "is it in the past" checks; tests pass a fixed one */
  now?: () => Date;
}

/** Builds the express app around a given database, so tests can inject an in-memory one. */
export function createApp(db: DB, options: AppOptions = {}): Express {
  const app = express();
  app.use(cors({ origin: properties.webOrigins }));
  app.use(express.json());

  app.use(createHealthRouter(db));
  const users = new UserRepository(db);
  const rooms = new RoomRepository(db);
  app.use(createUsersRouter(createUsersController(users)));
  app.use(createRoomsRouter(createRoomsController(rooms)));
  app.use(
    createReservedRoomsRouter(
      createReservedRoomsController({
        reservations: new ReservedRoomRepository(db),
        rooms,
        users,
        timeZone: properties.timeZone,
        now: options.now,
      }),
      requireCurrentUser(users),
    ),
  );

  app.use(errorHandler);
  return app;
}
