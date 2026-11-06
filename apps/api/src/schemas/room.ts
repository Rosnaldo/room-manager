import { z } from 'zod';

import { idParamsSchema, paginationQuerySchema, paginationSchema } from './common';
import { durationToMinutes } from '../lib/duration';
import { MIN_RESERVATION_MINUTES } from './reserved_room';

/** who is making the request: their role decides what they may do */
const userId = z.number().int().positive();

const name = z.string().trim().min(1).max(100);

const maxCapacity = z.number().int().min(1).max(10_000);

/** `HH:mm`, at least the 15-minute minimum reservation (or no booking would fit). */
const maxDuration = z.string().refine((v) => (durationToMinutes(v) ?? 0) >= MIN_RESERVATION_MINUTES, {
  message: 'must be a duration in the format HH:mm, from 00:15 to 23:59',
});

const resourceTag = z.string().trim().toLowerCase().min(1).max(50);

/** Resource tags are normalized (trimmed, lowercased) and de-duplicated, keeping first-seen order. */
const resources = z
  .array(resourceTag)
  .max(50)
  .transform((tags) => [...new Set(tags)]);

// ---- input ----

export const createRoomBodySchema = z
  .object({
    userId,
    name,
    maxCapacity,
    maxDuration,
    resources: resources.default([]),
  })
  .strict();

/** userId plus at least one field to change. Resources replace the room's whole list. */
export const editRoomBodySchema = z
  .object({
    userId,
    name: name.optional(),
    maxCapacity: maxCapacity.optional(),
    maxDuration: maxDuration.optional(),
    resources: resources.optional(),
  })
  .strict()
  .refine(({ userId: _, ...fields }) => Object.keys(fields).length > 0, { message: 'at least one field is required' });

export const roomIdParamsSchema = idParamsSchema;

/** The caller; must be an admin. */
export const deleteRoomBodySchema = z.object({ userId }).strict();

/**
 * Resource filter from the URL: `?resources=projector,tv`, `?resources=projector&resources=tv`, or both.
 * Normalized like stored tags; blank entries (e.g. a trailing comma) are ignored.
 */
const resourcesFilter = z
  .union([z.string(), z.array(z.string())])
  .transform((value) =>
    (Array.isArray(value) ? value : [value])
      .flatMap((v) => v.split(','))
      .map((v) => v.trim())
      .filter(Boolean),
  )
  .pipe(resources);

export const listRoomsQuerySchema = paginationQuerySchema
  .extend({
    /** rooms whose maxCapacity is at least this many people */
    capacity: z.coerce.number().int().min(1).max(10_000).optional(),
    /** rooms having every listed resource */
    resources: resourcesFilter.optional(),
  });

export const listRoomResourcesResponseSchema = z.object({ data: z.array(z.string()) }).strict();

// ---- output ----

export const roomResponseSchema = z
  .object({
    id: z.number().int().positive(),
    name: z.string(),
    maxCapacity: z.number().int(),
    maxDuration: z.string(),
    resources: z.array(z.string()),
  })
  .strict();

export const listRoomsResponseSchema = z
  .object({
    data: z.array(roomResponseSchema),
    pagination: paginationSchema,
  })
  .strict();
