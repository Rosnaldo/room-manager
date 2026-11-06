import type { RequestHandler } from 'express';
import type { IReservedRoom, Pagination } from '@repo/shared-types';

import type { ReservedRoomRepository } from '../repositories/reserved_room';
import type { RoomRepository } from '../repositories/room';
import type { UserRepository } from '../repositories/user';
import { BadRequestException } from '../exceptions/bad_request';
import { ConflictException } from '../exceptions/conflict';
import { NotFoundException } from '../exceptions/not_found';
import { ForbiddenException } from '../exceptions/forbidden';
import { formatInTimeZone, minutesBetween } from '../lib/local_datetime';
import { durationToMinutes, formatMinutes } from '../lib/duration';
import type { NoBody, NoParams, NoQuery } from './users';

// ---- declared request/response contracts (tests assert the zod schemas infer exactly these) ----

export interface CreateReservedRoomBody {
  userId: number;
  roomId: number;
  startAt: string;
  endAt: string;
}

export interface ListReservedRoomsQuery {
  page: number;
  size: number;
  userId: number;
}

export interface DeleteReservedRoomBody {
  userId: number;
}

export interface ReservedRoomIdParams {
  id: number;
}

export type ReservedRoomResponse = IReservedRoom;

export interface ListReservedRoomsResponse {
  data: ReservedRoomResponse[];
  pagination: Pagination;
}

export interface ReservedRoomsController {
  create: RequestHandler<NoParams, ReservedRoomResponse, CreateReservedRoomBody, NoQuery>;
  /** one user's reservations (userId in the query) */
  list: RequestHandler<NoParams, ListReservedRoomsResponse, NoBody, ListReservedRoomsQuery>;
  /** by its owner only */
  delete: RequestHandler<ReservedRoomIdParams, void, DeleteReservedRoomBody, NoQuery>;
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
      const room = rooms.findById(roomId);
      if (!room) throw new NotFoundException('room {id} not found', { id: roomId });

      if (startAt < formatInTimeZone(now(), timeZone)) {
        throw new BadRequestException('invalid request body', { details: { startAt: ['must not be in the past'] } });
      }

      const maxMinutes = durationToMinutes(room.maxDuration)!;
      if (minutesBetween(startAt, endAt) > maxMinutes) {
        throw new BadRequestException('invalid request body', {
          details: {
            endAt: [{ template: 'reservation must last at most {max} in this room', params: { max: formatMinutes(maxMinutes) } }],
          },
        });
      }

      const result = reservations.createIfFree({ userId, roomId, startAt, endAt });
      if (!result.ok) {
        throw conflictError(result.conflict.startAt, result.conflict.endAt);
      }
      res.status(201).json(result.reservation);
    },

    list: (req, res) => {
      const { userId, page, size } = req.query;
      if (!users.findById(userId)) throw new NotFoundException('user {id} not found', { id: userId });
      res.json(reservations.listByUser({ userId, page, size }));
    },

    delete: (req, res) => {
      const reservation = reservations.findById(req.params.id);
      if (!reservation) throw new NotFoundException('reservation {id} not found', { id: req.params.id });

      const { userId } = req.body;
      if (!users.findById(userId)) throw new NotFoundException('user {id} not found', { id: userId });
      if (reservation.userId !== userId) {
        throw new ForbiddenException('only the owner can cancel this reservation');
      }

      reservations.delete(reservation.id);
      res.status(204).end();
    },
  };
}
