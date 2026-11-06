import type { RequestHandler } from 'express';
import type { IReservedRoom } from '@repo/shared-types';

import type { ReservedRoomRepository } from '../repositories/reserved_room';
import type { RoomRepository } from '../repositories/room';
import type { UserRepository } from '../repositories/user';
import { BadRequestException } from '../exceptions/bad_request';
import { ConflictException } from '../exceptions/conflict';
import { NotFoundException } from '../exceptions/not_found';
import { formatInTimeZone } from '../lib/local_datetime';
import type { NoParams, NoQuery } from './users';

// ---- declared request/response contracts (tests assert the zod schemas infer exactly these) ----

export interface CreateReservedRoomBody {
  userId: number;
  roomId: number;
  startAt: string;
  endAt: string;
}

export type ReservedRoomResponse = IReservedRoom;

export interface ReservedRoomsController {
  create: RequestHandler<NoParams, ReservedRoomResponse, CreateReservedRoomBody, NoQuery>;
}

export interface ReservedRoomsDeps {
  reservations: ReservedRoomRepository;
  rooms: RoomRepository;
  users: UserRepository;
  /** IANA zone the wall-clock times are in */
  timeZone: string;
  now?: () => Date;
}

/** `YYYY-MM-DDTHH:mm:ss` → `DD/MM/YYYY`, `HH:mm`. */
const dateOf = (v: string) => `${v.slice(8, 10)}/${v.slice(5, 7)}/${v.slice(0, 4)}`;
const timeOf = (v: string) => v.slice(11, 16);

/** Names the slot that is taken; both dates when it crosses midnight. */
function conflictError(startAt: string, endAt: string): ConflictException {
  return startAt.slice(0, 10) === endAt.slice(0, 10)
    ? new ConflictException('room is already reserved from {start} to {end} on {date}', {
        start: timeOf(startAt),
        end: timeOf(endAt),
        date: dateOf(startAt),
      })
    : new ConflictException('room is already reserved from {startDate} {start} to {endDate} {end}', {
        startDate: dateOf(startAt),
        start: timeOf(startAt),
        endDate: dateOf(endAt),
        end: timeOf(endAt),
      });
}

// ---- handlers ----

export function createReservedRoomsController(deps: ReservedRoomsDeps): ReservedRoomsController {
  const { reservations, rooms, users, timeZone, now = () => new Date() } = deps;

  return {
    create: (req, res) => {
      const { userId, roomId, startAt, endAt } = req.body;

      if (!users.findById(userId)) throw new NotFoundException('user {id} not found', { id: userId });
      if (!rooms.findById(roomId)) throw new NotFoundException('room {id} not found', { id: roomId });

      if (startAt < formatInTimeZone(now(), timeZone)) {
        throw new BadRequestException('invalid request body', { details: { startAt: ['must not be in the past'] } });
      }

      const result = reservations.createIfFree({ userId, roomId, startAt, endAt });
      if (!result.ok) {
        throw conflictError(result.conflict.startAt, result.conflict.endAt);
      }
      res.status(201).json(result.reservation);
    },
  };
}
