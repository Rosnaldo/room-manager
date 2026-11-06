import { z } from 'zod';

import { isLocalDateTime, minutesBetween } from '../lib/local_datetime';

export const MIN_RESERVATION_MINUTES = 15;
export const MAX_RESERVATION_MINUTES = 4 * 60;

const id = z.number().int().positive();

/** Local wall-clock time, `YYYY-MM-DDTHH:mm:ss`, with no timezone. Must be a real date and time. */
export const localDateTimeSchema = z
  .string()
  .refine(isLocalDateTime, { message: 'must be a valid date-time in the format YYYY-MM-DDTHH:mm:ss' });

// ---- input ----

/**
 * Shape and duration rules. "Not in the past" and "no overlap" need the clock and the database,
 * so the controller checks those.
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
  });

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
