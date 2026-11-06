import type { RequestHandler } from 'express';

/** What a handler's declared types are, unpacked from RequestHandler<P, Res, Body, Query>. */
export type Contract<H> = H extends RequestHandler<infer P, infer Res, infer B, infer Q>
  ? { params: P; response: Res; body: B; query: Q }
  : never;

/** Shape of T after JSON.stringify (Dates become strings). */
export type Jsonify<T> = T extends Date
  ? string
  : T extends (infer U)[]
    ? Jsonify<U>[]
    : T extends object
      ? { [K in keyof T]: Jsonify<T[K]> }
      : T;
