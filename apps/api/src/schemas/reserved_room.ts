import { z } from 'zod';

import { isLocalDateTime, minutesBetween } from '../lib/local_datetime';
import { endsWithinHours, isWeekday, startsWithinHours } from '../lib/business_hours';
import { idParamsSchema, paginationQuerySchema, paginationSchema } from './common';

export const MIN_RESERVATION_MINUTES = 15;
export const MAX_RESERVATION_MINUTES = 4 * 60;

const id = z.number().int().positive();

/** Local wall-clock time, `YYYY-MM-DDTHH:mm:ss`, with no timezone. Must be a real date and time. */
export const localDateTimeSchema = z
  .string()
  .refine(isLocalDateTime, { message: 'must be a valid date-time in the format YYYY-MM-DDTHH:mm:ss' });

// ---- input ----

/**
 * Shape, duration and business-hours rules (weekdays, 08:00–20:00). "Not in the past" and
 * "no overlap" need the clock and the database, so the controller checks those.
 */
export const createReservedRoomBodySchema = z
  .object({
    userId: id,
    roomId: id,
    startAt: localDateTimeSchema,
    endAt: localDateTimeSchema,
  })
  .strict()
  .superRefine((body, ctx) => {
    if (!isLocalDateTime(body.startAt) || !isLocalDateTime(body.endAt)) return;

    const minutes = minutesBetween(body.startAt, body.endAt);
    if (minutes <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endAt'], message: 'must be after startAt' });
    } else if (minutes < MIN_RESERVATION_MINUTES) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endAt'], message: 'reservation must last at least 15 minutes' });
    } else if (minutes > MAX_RESERVATION_MINUTES) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endAt'], message: 'reservation must last at most 4 hours' });
    }

    // SALA-5: only on weekdays, from 08:00 to 20:00
    if (!isWeekday(body.startAt)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['startAt'], message: 'reservations are only allowed on weekdays (Monday to Friday)' });
    }
    if (!startsWithinHours(body.startAt)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['startAt'], message: 'reservations must be between 08:00 and 20:00' });
    }
    if (minutes > 0 && !endsWithinHours(body.startAt, body.endAt)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endAt'], message: 'reservations must be between 08:00 and 20:00' });
    }
  });

/** `userId`: whose reservations. In the query string, because a GET request can't carry a body. */
export const listReservedRoomsQuerySchema = paginationQuerySchema
  .extend({ userId: z.coerce.number().int().positive() })
  .strict();

/** The caller; only the reservation's owner can cancel it. */
export const deleteReservedRoomBodySchema = z.object({ userId: id }).strict();

export const reservedRoomIdParamsSchema = idParamsSchema;

// ---- output ----

export const reservedRoomResponseSchema = z
  .object({
    id,
    userId: id,
    roomId: id,
    startAt: localDateTimeSchema,
    endAt: localDateTimeSchema,
  })
  .strict();

export const listReservedRoomsResponseSchema = z
  .object({
    data: z.array(reservedRoomResponseSchema),
    pagination: paginationSchema,
  })
  .strict();
