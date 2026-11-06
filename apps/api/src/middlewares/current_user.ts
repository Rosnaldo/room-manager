import type { NextFunction, Request, Response } from 'express';

import type { UserRepository } from '../repositories/user';
import { UnauthorizedException } from '../exceptions/unauthorized';

export const USER_ID_HEADER = 'x-user-id';

/** Generic over the request types, so it fits in any route's handler chain without erasing them. */
export type CurrentUserMiddleware = <P, ResBody, ReqBody, Q>(
  req: Request<P, ResBody, ReqBody, Q>,
  res: Response<ResBody>,
  next: NextFunction,
) => void;

/**
 * Identifies the caller from the X-User-Id header (the web's "entrar como" session) and puts the
 * user on `req.currentUser`. Missing, malformed or unknown ids are rejected with 401.
 */
export function requireCurrentUser(users: UserRepository): CurrentUserMiddleware {
  return (req, _res, next) => {
    const raw = req.header(USER_ID_HEADER);
    const id = Number(raw);
    if (!raw || !/^\d+$/.test(raw) || id <= 0) throw new UnauthorizedException('the X-User-Id header is required');

    const user = users.findById(id);
    if (!user) throw new UnauthorizedException('user {id} not found', { id });

    req.currentUser = user;
    next();
  };
}
