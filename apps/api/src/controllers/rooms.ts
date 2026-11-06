import type { RequestHandler } from 'express';
import type { IRoom, Pagination } from '@repo/shared-types';

import type { RoomRepository } from '../repositories/room';
import { ConflictException } from '../exceptions/conflict';
import type { NoBody, NoParams, NoQuery } from './users';

// ---- declared request/response contracts (tests assert the zod schemas infer exactly these) ----

export interface CreateRoomBody {
  name: string;
  maxCapacity: number;
  resources: string[];
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
  create: RequestHandler<NoParams, RoomResponse, CreateRoomBody, NoQuery>;
  list: RequestHandler<NoParams, ListRoomsResponse, NoBody, ListRoomsQuery>;
  listResources: RequestHandler<NoParams, ListRoomResourcesResponse, NoBody, NoQuery>;
}

// ---- handlers ----

export function createRoomsController(rooms: RoomRepository): RoomsController {
  return {
    create: (req, res) => {
      if (rooms.findByName(req.body.name)) throw new ConflictException(`room ${req.body.name} already exists`);
      res.status(201).json(rooms.create(req.body));
    },

    list: (req, res) => {
      res.json(rooms.list(req.query));
    },

    listResources: (_req, res) => {
      res.json({ data: rooms.listResources() });
    },
  };
}
