import type { RequestHandler } from 'express';
import type { IUser, Pagination, UserRole } from '@repo/shared-types';

import type { UserRepository } from '../repositories/user';
import { ConflictException } from '../exceptions/conflict';
import { NotFoundException } from '../exceptions/not_found';

// ---- declared request/response contracts (tests assert the zod schemas infer exactly these) ----

type Role = keyof typeof UserRole;

export interface UserIdParams {
  id: number;
}

export interface CreateUserBody {
  firstName: string;
  lastName: string;
  email?: string;
  role: Role;
}

export interface EditUserBody {
  firstName?: string;
  lastName?: string;
  email?: string | null;
  role?: Role;
}

export interface ListUsersQuery {
  page: number;
  size: number;
  role?: Role;
}

export type UserResponse = IUser;

export interface ListUsersResponse {
  data: UserResponse[];
  pagination: Pagination;
}

export type NoParams = Record<string, never>;
export type NoBody = Record<string, never>;
export type NoQuery = Record<string, never>;

export interface UsersController {
  create: RequestHandler<NoParams, UserResponse, CreateUserBody, NoQuery>;
  list: RequestHandler<NoParams, ListUsersResponse, NoBody, ListUsersQuery>;
  find: RequestHandler<UserIdParams, UserResponse, NoBody, NoQuery>;
  edit: RequestHandler<UserIdParams, UserResponse, EditUserBody, NoQuery>;
  delete: RequestHandler<UserIdParams, void, NoBody, NoQuery>;
}

// ---- handlers ----

export function createUsersController(users: UserRepository): UsersController {
  function assertEmailAvailable(email: string, ownId?: number) {
    const owner = users.findByEmail(email);
    if (owner && owner.id !== ownId) throw new ConflictException(`email ${email} is already in use`);
  }

  function getOr404(id: number): IUser {
    const user = users.findById(id);
    if (!user) throw new NotFoundException(`user ${id} not found`);
    return user;
  }

  return {
    create: (req, res) => {
      if (req.body.email) assertEmailAvailable(req.body.email);
      res.status(201).json(users.create(req.body));
    },

    list: (req, res) => {
      res.json(users.list(req.query));
    },

    find: (req, res) => {
      res.json(getOr404(req.params.id));
    },

    edit: (req, res) => {
      getOr404(req.params.id);
      if (req.body.email) assertEmailAvailable(req.body.email, req.params.id);
      res.json(users.update(req.params.id, req.body));
    },

    delete: (req, res) => {
      if (!users.delete(req.params.id)) throw new NotFoundException(`user ${req.params.id} not found`);
      res.status(204).end();
    },
  };
}
