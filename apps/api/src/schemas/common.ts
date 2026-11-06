import { z } from 'zod';

export const idParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(100).default(20),
});

export const paginationSchema = z.object({
  currentPage: z.number().int().min(1),
  totalPages: z.number().int().min(0),
  totalRecords: z.number().int().min(0),
  size: z.number().int().min(1),
});

/** ISO string on the wire -> Date once parsed (matches the Date fields of the shared types). */
export const isoDateSchema = z.string().datetime().pipe(z.coerce.date());

export const errorResponseSchema = z.object({
  message: z.string(),
  details: z.record(z.array(z.string())).optional(),
});

/** For endpoints that take no path/query params: rejects any key. Infers Record<string, never>. */
export const emptySchema = z.record(z.never());
