import type { RequestHandler } from 'express';
import type { IRoom, Pagination } from '@repo/shared-types';

import type { RoomRepository } from '../repositories/room';
import type { UserRepository } from '../repositories/user';
import type { ReservedRoomRepository } from '../repositories/reserved_room';
import { durationToMinutes, formatMinutes } from '../lib/duration';
import { formatInTimeZone } from '../lib/local_datetime';
import { ForbiddenException } from '../exceptions/forbidden';
import { ConflictException } from '../exceptions/conflict';
import { NotFoundException } from '../exceptions/not_found';
import type { NoBody, NoParams, NoQuery } from './users';

// ---- declared request/response contracts (tests assert the zod schemas infer exactly these) ----

export interface CreateRoomBody {
  /** the caller; must be an admin */
  userId: number;
  name: string;
  maxCapacity: number;
  /** `HH:mm` */
  maxDuration: string;
  resources: string[];
}

export interface EditRoomBody {
  /** the caller; must be an admin */
  userId: number;
  name?: string;
  maxCapacity?: number;
  maxDuration?: string;
  resources?: string[];
}

export interface RoomIdParams {
  id: number;
}

export interface DeleteRoomBody {
  /** the caller; must be an admin */
  userId: number;
}

export interface ListRoomsQuery {
  page: number;
  size: number;
  capacity?: number;
  resources?: string[];
}

export type RoomResponse = IRoom;

export interface ListRoomsResponse {
  data: RoomResponse[];
  pagination: Pagination;
}

export interface ListRoomResourcesResponse {
  data: string[];
}

export interface RoomsController {
  /** admin only */
  create: RequestHandler<NoParams, RoomResponse, CreateRoomBody, NoQuery>;
  /** admin only */
  edit: RequestHandler<RoomIdParams, RoomResponse, EditRoomBody, NoQuery>;
  /** admin only; deletes the room's reservations too */
  delete: RequestHandler<RoomIdParams, void, DeleteRoomBody, NoQuery>;
  find: RequestHandler<RoomIdParams, RoomResponse, NoBody, NoQuery>;
  list: RequestHandler<NoParams, ListRoomsResponse, NoBody, ListRoomsQuery>;
  listResources: RequestHandler<NoParams, ListRoomResourcesResponse, NoBody, NoQuery>;
}

// ---- handlers ----

export interface RoomsDeps {
  rooms: RoomRepository;
  users: UserRepository;
  reservations: ReservedRoomRepository;
  /** IANA zone the reservation times are in, to tell which reservations haven't ended */
  timeZone: string;
  now?: () => Date;
}

export function createRoomsController(deps: RoomsDeps): RoomsController {
  const { rooms, users, reservations, timeZone, now = () => new Date() } = deps;

  /** The caller named by `userId` must exist (404) and be an admin (403). */
  function assertAdmin(userId: number): void {
    const user = users.findById(userId);
    if (!user) throw new NotFoundException('user {id} not found', { id: userId });
    if (user.role !== 'admin') throw new ForbiddenException('only admins can do this');
  }

  return {
    create: (req, res) => {
      const { userId, ...room } = req.body;
      assertAdmin(userId);
      if (rooms.findByName(room.name)) throw new ConflictException('room {name} already exists', { name: room.name });
      res.status(201).json(rooms.create(room));
    },

    edit: (req, res) => {
      const { userId, ...changes } = req.body;
      assertAdmin(userId);

      const { id } = req.params;
      if (!rooms.findById(id)) throw new NotFoundException('room {id} not found', { id });

      // a shorter limit can't leave existing (not yet ended) bookings over it
      if (changes.maxDuration !== undefined) {
        const minutes = durationToMinutes(changes.maxDuration)!;
        const longer = reservations.countLongerThan(id, minutes, formatInTimeZone(now(), timeZone));
        if (longer > 0) {
          throw new ConflictException('cannot lower the maximum duration to {max}: {count} upcoming reservation(s) last longer', {
            max: formatMinutes(minutes),
            count: longer,
          });
        }
      }

      const { name } = changes;
      // the name stays unique (ignoring case); keeping or re-casing its own name is fine
      const sameName = name !== undefined ? rooms.findByName(name) : undefined;
      if (sameName && sameName.id !== id) throw new ConflictException('room {name} already exists', { name: name! });

      res.json(rooms.update(id, changes));
    },

    delete: (req, res) => {
      assertAdmin(req.body.userId);
      if (!rooms.delete(req.params.id)) throw new NotFoundException('room {id} not found', { id: req.params.id });
      res.status(204).end();
    },

    find: (req, res) => {
      const room = rooms.findById(req.params.id);
      if (!room) throw new NotFoundException('room {id} not found', { id: req.params.id });
      res.json(room);
    },

    list: (req, res) => {
      res.json(rooms.list(req.query));
    },

    listResources: (_req, res) => {
      res.json({ data: rooms.listResources() });
    },
  };
}
