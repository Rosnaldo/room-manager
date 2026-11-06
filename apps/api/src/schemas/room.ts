import { z } from 'zod';

import { paginationQuerySchema, paginationSchema } from './common';

const name = z.string().trim().min(1).max(100);

/** Resource tags are normalized (trimmed, lowercased) and de-duplicated, keeping first-seen order. */
const resources = z
  .array(z.string().trim().toLowerCase().min(1).max(50))
  .max(50)
  .transform((tags) => [...new Set(tags)]);

// ---- input ----

export const createRoomBodySchema = z
  .object({
    name,
    resources: resources.default([]),
  })
  .strict();

export const listRoomsQuerySchema = paginationQuerySchema;

// ---- output ----

export const roomResponseSchema = z
  .object({
    id: z.number().int().positive(),
    name: z.string(),
    resources: z.array(z.string()),
  })
  .strict();

export const listRoomsResponseSchema = z
  .object({
    data: z.array(roomResponseSchema),
    pagination: paginationSchema,
  })
  .strict();
