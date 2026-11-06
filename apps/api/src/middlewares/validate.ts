import type { RequestHandler } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';
import { type z } from 'zod';

import { BadRequestException } from '../exceptions/bad_request';

type Schema<T> = z.ZodType<T, z.ZodTypeDef, unknown>;

interface Schemas<P, B, Q> {
  params?: Schema<P>;
  body?: Schema<B>;
  query?: Schema<Q>;
}

const WHERE = {
  params: 'invalid path params',
  query: 'invalid query params',
  body: 'invalid request body',
} as const;

function parse<T>(schema: Schema<T>, input: unknown, where: keyof typeof WHERE): T {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  throw new BadRequestException(WHERE[where], { zodError: result.error });
}

/**
 * Parses req.params / req.body / req.query with zod and replaces them with the parsed output,
 * so handlers declared as RequestHandler<P, Res, B, Q> receive exactly the schema output types.
 */
export function validate<P = ParamsDictionary, B = unknown, Q = ParsedQs>(
  schemas: Schemas<P, B, Q>,
): RequestHandler<P, unknown, B, Q> {
  return (req, _res, next) => {
    if (schemas.params) req.params = parse(schemas.params, req.params, 'params');
    if (schemas.query) req.query = parse(schemas.query, req.query, 'query');
    if (schemas.body) req.body = parse(schemas.body, req.body ?? {}, 'body');
    next();
  };
}
