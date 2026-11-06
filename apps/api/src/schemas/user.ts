import { z } from 'zod';
import { UserRole } from '@repo/shared-types';

import { idParamsSchema, isoDateSchema, paginationQuerySchema, paginationSchema } from './common';

type UserRoleValue = (typeof UserRole)[keyof typeof UserRole];
export const userRoleSchema = z.enum(Object.values(UserRole) as [UserRoleValue, ...UserRoleValue[]]);

const firstName = z.string().trim().min(1).max(100);
const lastName = z.string().trim().min(1).max(100);
const email = z.string().trim().toLowerCase().email().max(254);

// ---- input ----

export const createUserBodySchema = z
  .object({
    firstName,
    lastName,
    email: email.optional(),
    role: userRoleSchema,
  })
  .strict();

export const editUserBodySchema = z
  .object({
    firstName: firstName.optional(),
    lastName: lastName.optional(),
    email: email.nullable().optional(),
    role: userRoleSchema.optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, { message: 'at least one field is required' });

export const listUsersQuerySchema = paginationQuerySchema.extend({
  role: userRoleSchema.optional(),
});

export const userIdParamsSchema = idParamsSchema;

// ---- output ----

export const userResponseSchema = z
  .object({
    id: z.number().int().positive(),
    firstName: z.string(),
    lastName: z.string(),
    email: z.string().email().optional(),
    role: userRoleSchema,
    createdAt: isoDateSchema,
    updatedAt: isoDateSchema,
  })
  .strict();

export const listUsersResponseSchema = z
  .object({
    data: z.array(userResponseSchema),
    pagination: paginationSchema,
  })
  .strict();
